import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Link,
  LogOut,
  MapPin,
  Moon,
  Pencil,
  Plus,
  Settings,
  Sparkles,
  Star,
  Sun,
  User,
  X,
} from "lucide-react";
import { isValidElement, lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode, Ref } from "react";
import { buildAnnualTimingContext, rankTransits } from "@tldr/astro-knowledge/timing-engine";
import type { TraditionalPlanet, ZodiacSign } from "@tldr/astro-knowledge/timing-engine";
import { FriendsPageShell } from "./components/FriendsPageShell";
import { ModalPortal } from "./components/ModalPortal";
import { ProfileAvatar, profileInitials } from "./components/ProfileAvatar";
import { AppearanceToggle, HouseSignLabelToggle, SwitchControl } from "./components/SettingsControls";
import {
  AspectGlyphs,
  FriendPlacementTable,
  InlineGlyphIcon,
  PlanetPlacementRow,
  PlacementGlyphIcon,
  PlacementTableRow,
  SynastryPlacementsComparison,
  placementPlanetOrder,
  placementDignity,
  socialPlacementRows
} from "./components/charts/PlacementRows";
import type { PlacementHouseInsight, SocialPlacementRow } from "./components/charts/PlacementRows";
import {
  aspectGlyph,
  aspectIconFiles,
  normalizeAspectType,
  pointGlyph,
  pointIconFiles,
  pointRetrogradeIconFiles,
  zodiacAssetHref,
} from "./components/charts/chartAssets";
import { SkyWheel, SynastryWheel, type InterChartAspectLine } from "./components/charts/Wheels";
import { fallbackHookByKey, knowledgeIdsForFallbackHook, type FallbackHookContext } from "./content/fallbackHooks";
import type { ContentBundle } from "./content/types";
import type { RelationshipChartFullscreenMode } from "./features/friends/RelationshipChartFullscreen";
import type { RelationshipComparisonOption } from "./features/friends/RelationshipComparePicker";
import {
  SkyAspectGroup,
  SkyAspectsSection,
  SkyPlacementList,
  SkyPlacementListItem,
  SkyTodayView
} from "./features/sky/SkyToday";
import {
  aspectTone,
  detailGlyphForPlacement,
  formatPlacementPosition,
  formatPlanetDegree,
  natalPlacementTitle,
  placementStatuses,
  skyNodeDisplayPositions,
  solarPhaseStatusFor,
  wholeDegreeOrb
} from "./features/sky/skyHelpers";
import { defaultLocation, getAstrodienstSky, getCurrentSky } from "./services/ephemeris";
import {
  getAuthAccount,
  isAuthConfigured,
  loadPersistedProfile,
  onAuthAccountChange,
  signInWithEmail,
  signInWithProvider,
  signOutAuth,
  signUpWithEmail,
  upsertPersistedProfile
} from "./services/auth";
import type { AuthAccount } from "./services/auth";
import {
  generatedContentDrilldown,
  generatedContentSections,
  generatedContentParagraphs,
  loadLiveGeneratedContent,
  type GeneratedContentDrilldown,
  type LiveGeneratedContent
} from "./services/generatedContent";
import {
  createManualChart,
  deleteManualChart,
  listManualCharts,
  migrateLocalManualChartsToRemote,
  updateManualChart
} from "./services/manualCharts";
import type { ManualChart, ManualChartInput, ManualChartType } from "./services/manualCharts";
import { hasMapboxToken, reverseGeocodeCity, searchCities } from "./services/mapbox";
import { getInitialAccountMode } from "./services/session";
import { browserTimeZone, timeZoneForLocation, withTimeZone, zonedDateTimeToUtc } from "./services/timezones";
import {
  compareRelationship,
  getPersonalTiming,
  isTldrAstroApiConfigured,
  type RelationshipCompareResponse,
  type TldrAstroChartSettings,
  type TldrAstroSubject,
  type PersonalTimingResponse
} from "./services/tldrastroApi";
import {
  generateUserContent,
  loadUserGeneratedInterpretation,
  type UserGeneratedSubjectType
} from "./services/userGeneratedContent";
import type { AccountMode, LocationInput, PlanetPosition, SkySnapshot } from "./types";

type PortalMode = AccountMode | "profile" | "friends" | "account" | "settings";
type TransitTerm = "short" | "long";
type TransitDirection = "applying" | "separating";
type UiTheme = "light" | "dark";
type SignupProvider = "email" | "google";

type UserChart = {
  id: string;
  name: string;
  type: "Birth chart";
  birthDate: string;
  birthTime: string;
  birthCity: string;
  birthLocation?: LocationInput | null;
};

type ChartSettings = {
  houseSystem: "Whole House";
  zodiac: "Tropical";
  aspects: "Standard" | "Tight";
  houseSignLabelStyle: HouseSignLabelStyle;
  lifeAreaFocus: LifeAreaFocus[];
};

type HouseSignLabelStyle = "text" | "glyph";

type LifeAreaFocus =
  | "career"
  | "relationships"
  | "friends"
  | "family"
  | "health"
  | "money"
  | "home"
  | "communication"
  | "creativity"
  | "emotional-needs"
  | "growth"
  | "spirituality";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  provider: SignupProvider;
  avatarUrl?: string;
  sun: string;
  moon: string;
  rising: string;
  currentLocation?: string;
  currentLocationData?: LocationInput | null;
  settings?: ChartSettings;
  charts: UserChart[];
};

type SignupForm = {
  fullName: string;
  email: string;
  password: string;
  birthDate: string;
  birthTime: string;
  unknownBirthTime: boolean;
  birthCity: string;
  birthLocation: LocationInput | null;
};

type TransitForm = {
  name: string;
  birthPlace: string;
  birthLocation: LocationInput | null;
  birthMonth: string;
  birthDay: string;
  birthYear: string;
  birthHour: string;
  birthMinute: string;
  birthMeridiem: "AM" | "PM";
  unknownBirthTime: boolean;
  currentLocation: string;
  currentLocationData: LocationInput | null;
  chartDate: string;
};

type ManualChartForm = {
  chartType: ManualChartType;
  displayName: string;
  relationshipType: string;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  birthPlace: string;
  birthLocation: LocationInput | null;
};

type TransitItem = {
  id: string;
  term: TransitTerm;
  glyph: string;
  transitPlanet: string;
  transitSign?: string;
  aspect: string;
  natalPoint: string;
  natalSign: string;
  natalHouse?: number;
  orb: string;
  direction: TransitDirection;
  arc: number[];
  note: string;
  score?: number;
  significance?: string;
  timingBonuses?: string[];
  isSlowGeneralWeather?: boolean;
};

type PersonalTimingStatus = "idle" | "loading" | "ready" | "error";
type RelationshipCompareStatus = "idle" | "loading" | "ready" | "error";

type FriendProfileTab = "natal" | "synastry" | "composite";
type FriendsMainView = "circle" | "charts" | "profile";
type FriendsTab = Exclude<FriendsMainView, "profile">;

type FriendTimingContext = {
  age: number | null;
  profectedHouse: number | null;
  profectedSign: string;
  lordOfYear: string;
  chartRuler?: string;
  activeNatalPlanetsInProfectedSign?: string[];
};

type ComparisonPoint = {
  name: string;
  glyph: string;
  longitude: number;
  role: string;
};

type SynastryContact = {
  id: string;
  friendPoint: ComparisonPoint;
  yourPoint: ComparisonPoint;
  aspect: string;
  orb: number;
  score: number;
  tone: string;
  summary: string;
  contentKeys: string[];
};

type HouseOverlay = {
  id: string;
  planet: string;
  glyph: string;
  ownerName: string;
  targetName: string;
  house: number;
  summary: string;
  detailParagraphs: string[];
  contentKeys: string[];
};

type CitySuggestion = Awaited<ReturnType<typeof searchCities>>[number];
type SignupTimeParts = {
  hour: string;
  minute: string;
  meridiem: "AM" | "PM";
};

type SignupDateParts = {
  month: string;
  day: string;
  year: string;
};

type AuthMode = "create" | "login";
type SkyDetail = {
  glyph: string;
  kicker: string;
  title: string;
  meta: string;
  subtitle?: string;
  lensHint?: ReactNode;
  compactHeader?: boolean;
  plainBody?: boolean;
  bodyBeforeSections?: boolean;
  retrograde?: boolean;
  body: ReactNode[];
  sections?: Array<{
    heading: string;
    body: ReactNode;
  }>;
  relatedAspects?: {
    heading: string;
    rows: ReactNode[];
  };
  astrologyDrilldown?: GeneratedContentDrilldown | null;
  content?: ContentBundle;
};

type GeneratedContentMap = Map<string, LiveGeneratedContent>;

type YouTransitArticle = {
  id: string;
  title: string;
  glyph?: string;
  subtitle: string;
  lensHint?: ReactNode;
  compactHeader?: boolean;
  plainBody?: boolean;
  bodyBeforeSections?: boolean;
  body?: ReactNode[];
  summary: string;
  summaryHeading?: string;
  sections: Array<{
    heading: string;
    tldr: string;
    body: string;
  }>;
  relatedAspects?: {
    heading: string;
    rows: ReactNode[];
  };
  meta: Array<{
    label: string;
    value: string;
  }>;
};

type NatalPlacementFrame = {
  house: string;
  growth: string;
  integration: string;
};

type ContentDomain = "sky" | "natal" | "relationship";
type LazyContentRegistry = Pick<
  typeof import("./content/skyRegistry"),
  | "approvedVoiceOrKnowledgeFallback"
  | "retrogradePlanetMeaning"
  | "aspectContentId"
  | "natalAspectContentId"
  | "currentSkyAspectContentId"
  | "transitNatalContentId"
  | "placementContentId"
  | "skyPlacementContentId"
  | "natalPlacementContentId"
>;

type ContentFallback = {
  bundle: ContentBundle;
  summary: string | null;
  body: string | null;
  detailParagraphs: string[];
};

const loadedContentRegistries: Partial<Record<ContentDomain, LazyContentRegistry>> = {};
const loadingContentRegistries: Partial<Record<ContentDomain, Promise<LazyContentRegistry | null>>> = {};
const contentRegistryListeners = new Set<() => void>();

function subscribeContentRegistry(listener: () => void) {
  contentRegistryListeners.add(listener);

  return () => {
    contentRegistryListeners.delete(listener);
  };
}

function notifyContentRegistryListeners() {
  contentRegistryListeners.forEach((listener) => listener());
}

function normalizeContentIdPart(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function contentRegistryFor(domain: ContentDomain) {
  return loadedContentRegistries[domain] ?? null;
}

function loadContentRegistry(domain: ContentDomain) {
  if (loadedContentRegistries[domain]) {
    return Promise.resolve(loadedContentRegistries[domain]);
  }

  if (loadingContentRegistries[domain]) {
    return loadingContentRegistries[domain];
  }

  loadingContentRegistries[domain] = importContentRegistry(domain)
    .then((registry) => {
      loadedContentRegistries[domain] = registry;
      loadingContentRegistries[domain] = undefined;
      notifyContentRegistryListeners();
      return registry;
    })
    .catch((error) => {
      loadingContentRegistries[domain] = undefined;
      console.warn("Astro knowledge registry failed to load; source-backed content will be unavailable.", error);
      return null;
    });

  return loadingContentRegistries[domain];
}

function baseAspectContentId(planetA: string, aspect: string, planetB: string) {
  return `${normalizeContentIdPart(planetA)}-${normalizeContentIdPart(aspect)}-${normalizeContentIdPart(planetB)}`;
}

function basePlacementContentId(planet: string, sign: string) {
  return `${normalizeContentIdPart(planet)}-in-${normalizeContentIdPart(sign)}`;
}

function aspectContentId(planetA: string, aspect: string, planetB: string, domain: ContentDomain = "natal") {
  const registry = contentRegistryFor(domain);

  if (registry) {
    if (domain === "natal") {
      return registry.natalAspectContentId(planetA, aspect, planetB);
    }

    return registry.aspectContentId(planetA, aspect, planetB);
  }

  const baseId = baseAspectContentId(planetA, aspect, planetB);
  return domain === "natal" ? `natal-${baseId}` : baseId;
}

function currentSkyAspectContentId(planetA: string, aspect: string, planetB: string) {
  const registry = contentRegistryFor("sky");

  if (registry) {
    return registry.currentSkyAspectContentId(planetA, aspect, planetB);
  }

  return `sky-${baseAspectContentId(planetA, aspect, planetB)}`;
}

function transitNatalContentId(transiting: string, aspect: string, natal: string, domain: ContentDomain = "natal") {
  const registry = contentRegistryFor(domain);

  if (registry) {
    return registry.transitNatalContentId(transiting, aspect, natal);
  }

  return `transit-natal-${baseAspectContentId(transiting, aspect, natal)}`;
}

function placementContentId(planet: string, sign: string, domain: ContentDomain = "natal") {
  const registry = contentRegistryFor(domain);

  if (registry) {
    if (domain === "sky") {
      return registry.skyPlacementContentId(planet, sign);
    }

    if (domain === "natal") {
      return registry.natalPlacementContentId(planet, sign);
    }

    return registry.placementContentId(planet, sign);
  }

  const baseId = basePlacementContentId(planet, sign);
  return domain === "sky" || domain === "natal" ? `${domain}-${baseId}` : baseId;
}

function approvedVoiceOrKnowledgeFallback(id: string, domain: ContentDomain = "natal", allowKnowledgeOnly = false): ContentFallback {
  const registry = contentRegistryFor(domain);

  if (registry) {
    const fallback = registry.approvedVoiceOrKnowledgeFallback(id);

    if (!allowKnowledgeOnly && !hasApprovedVoiceContent(fallback)) {
      return emptyContentFallback(id);
    }

    return {
      ...fallback,
      detailParagraphs: fallback.detailParagraphs ?? []
    };
  }

  void loadContentRegistry(domain);
  return emptyContentFallback(id);
}

function emptyContentFallback(id: string): ContentFallback {
  return {
    bundle: {
      id,
      knowledge: null,
      voice: null,
      status: "INCOMPLETE"
    },
    summary: null,
    body: null,
    detailParagraphs: []
  };
}

function fallbackFromHook(
  hookKey: string,
  context: FallbackHookContext = {},
  _localFallback: Partial<Pick<ContentFallback, "summary" | "body" | "detailParagraphs">> = {},
  options: { allowKnowledgeOnly?: boolean } = {}
): ContentFallback {
  const hook = fallbackHookByKey(hookKey);
  const knowledgeIds = knowledgeIdsForFallbackHook(hookKey, context);

  for (const knowledgeId of knowledgeIds) {
    const fallback = approvedVoiceOrKnowledgeFallback(knowledgeId, hook?.domain ?? "natal", options.allowKnowledgeOnly);

    if (fallback.summary || fallback.body || fallback.detailParagraphs.length > 0) {
      return fallback;
    }
  }

  return emptyContentFallback(hookKey);
}

function retrogradePlanetMeaning(planet: string, domain: ContentDomain = "sky") {
  const registry = contentRegistryFor(domain);

  if (registry) {
    return registry.retrogradePlanetMeaning(planet);
  }

  void loadContentRegistry(domain);
  return null;
}

function hasApprovedVoiceContent(content: ContentFallback) {
  return content.bundle.status === "READY" && Boolean(content.bundle.voice);
}

const interpretationInReviewSummary = "";
const interpretationInReviewParagraphs: string[] = [];

function liveGeneratedContent(generatedContent: GeneratedContentMap, contentKey: string) {
  return generatedContent.get(contentKey) ?? null;
}

function mergeGeneratedContentMaps(...maps: GeneratedContentMap[]) {
  const merged: GeneratedContentMap = new Map();

  maps.forEach((map) => {
    map.forEach((value, key) => {
      if (!merged.has(key)) {
        merged.set(key, value);
      }
    });
  });

  return merged;
}

function liveGeneratedContentByKeys(generatedContent: GeneratedContentMap, contentKeys: string[]) {
  for (const contentKey of contentKeys) {
    const generated = liveGeneratedContent(generatedContent, contentKey);

    if (generated) {
      return generated;
    }
  }

  return null;
}

function generatedDetailSections(generated: LiveGeneratedContent | null) {
  return generatedContentSections(generated).map((section) => ({
    heading: section.heading,
    body: section.body
  }));
}

function generatedAstrologyDrilldown(generated: LiveGeneratedContent | null) {
  return generatedContentDrilldown(generated);
}

function skyGeneratedDateKey(generatedAt: string) {
  return generatedAt.slice(0, 10);
}

function skyAspectGeneratedContentKeys(aspect: SkySnapshot["aspects"][number], generatedAt: string) {
  const dateKey = skyGeneratedDateKey(generatedAt);

  return [
    `sky-aspect-${normalizeContentIdPart(aspect.from)}-${normalizeContentIdPart(aspect.type)}-${normalizeContentIdPart(aspect.to)}-${dateKey}`,
    currentSkyAspectContentId(aspect.from, aspect.type, aspect.to)
  ];
}

function skyPlacementGeneratedContentKeys(position: PlanetPosition, generatedAt: string) {
  const dateKey = skyGeneratedDateKey(generatedAt);
  const keys = new Set<string>();

  if (position.planet === "Sun") {
    keys.add(`sky-season-${normalizeContentIdPart(position.sign)}-${dateKey}`);
  }

  if (position.planet === "Moon") {
    keys.add(`sky-moon-${normalizeContentIdPart(position.sign)}-${dateKey}`);
  }

  if (position.motion === "retrograde") {
    keys.add(`sky-retrograde-${normalizeContentIdPart(position.planet)}-${dateKey}`);
  }

  keys.add(placementContentId(position.planet, position.sign, "sky"));

  return Array.from(keys);
}

function liveGeneratedSummary(generated: LiveGeneratedContent | null, fallback: string | null) {
  return generated?.summary?.trim() || generatedContentParagraphs(generated)[0] || fallback || interpretationInReviewSummary;
}

function liveGeneratedSummaryIfPresent(generated: LiveGeneratedContent | null) {
  return generated?.summary?.trim() || generatedContentParagraphs(generated)[0] || "";
}

function liveGeneratedBody(generated: LiveGeneratedContent | null, fallbackParagraphs: string[]) {
  const paragraphs = generatedContentParagraphs(generated);

  return paragraphs.length > 0
    ? paragraphs
    : fallbackParagraphs.length > 0
      ? fallbackParagraphs
      : interpretationInReviewParagraphs;
}

function liveGeneratedHeadline(generated: LiveGeneratedContent | null, fallback: string) {
  return generated?.headline?.trim() || fallback;
}

function personalDailyGeneratedContentKey(targetDate: string) {
  return `you-daily-horoscope-v3-${targetDate}`;
}

function personalTransitGeneratedContentKey(transit: Pick<TransitItem, "transitPlanet" | "aspect" | "natalPoint">, targetDate: string) {
  return `you-transit-v3-${normalizeContentIdPart(transit.transitPlanet)}-${normalizeContentIdPart(transit.aspect)}-${normalizeContentIdPart(transit.natalPoint)}-${targetDate}`;
}

function compactTransitFact(transit: Record<string, unknown>) {
  return {
    id: transit.id,
    transitPlanet: transit.transitPlanet,
    transitSign: transit.transitSign,
    transitHouse: transit.transitHouse,
    aspect: transit.aspect,
    natalPoint: transit.natalPoint,
    natalSign: transit.natalSign,
    natalHouse: transit.natalHouse,
    orb: transit.orb,
    direction: transit.direction,
    exactAt: transit.exactAt,
    windowStart: transit.windowStart,
    windowEnd: transit.windowEnd,
    score: transit.score,
    significance: transit.significance,
    knowledgeIds: transit.knowledgeIds
  };
}

function compactTransitItemFact(transit: TransitItem, targetDate: string) {
  return {
    id: transit.id,
    targetDate,
    transitPlanet: transit.transitPlanet,
    transitSign: transit.transitSign,
    aspect: transit.aspect,
    natalPoint: transit.natalPoint,
    natalSign: transit.natalSign,
    natalHouse: transit.natalHouse,
    orb: transit.orb,
    orbDegrees: transitOrbValue(transit),
    direction: transit.direction,
    term: transit.term,
    significance: transit.significance,
    timingBonuses: transit.timingBonuses ?? [],
    note: transit.note
  };
}

function personalTimingKnowledgeIds(personalTiming: PersonalTimingResponse) {
  return Array.from(new Set([
    ...personalTiming.app.contentFactIds,
    ...personalTiming.contentFacts.flatMap((fact) => fact.knowledgeIds),
    ...personalTiming.topTransits.flatMap((transit) => (
      Array.isArray(transit.knowledgeIds) ? transit.knowledgeIds.filter((item): item is string => typeof item === "string") : []
    ))
  ])).filter(Boolean);
}

function personalTimingGenerationFacts(personalTiming: PersonalTimingResponse, profile: UserProfile, targetDate: string) {
  const topBoostedTransit = personalTiming.timingBoostedTransits[0];

  return {
    type: "you_update_summary",
    targetDate,
    person: {
      name: profile.name,
      bigThree: {
        sun: profile.sun,
        moon: profile.moon,
        rising: profile.rising
      }
    },
    timing: {
      headline: personalTiming.app.headline,
      summary: personalTiming.app.summary,
      keyFactors: personalTiming.app.keyFactors,
      timingTags: personalTiming.app.timingTags,
      confidence: personalTiming.app.confidence,
      activatedHouse: personalTiming.activatedHouse,
      activatedSign: personalTiming.activatedSign,
      activatedRuler: personalTiming.activatedRuler,
      activatedNatalPlanets: personalTiming.activatedNatalPlanets
    },
    topBoostedTransit: topBoostedTransit
      ? {
          hit: compactTransitFact(topBoostedTransit.hit),
          baseScore: topBoostedTransit.baseScore,
          boostedScore: topBoostedTransit.boostedScore,
          boostReasons: topBoostedTransit.boostReasons
        }
      : null,
    topTransits: personalTiming.topTransits.slice(0, 5).map(compactTransitFact),
    contentFacts: personalTiming.contentFacts
  };
}

const synastryCardPreviewCharacterLimit = 220;

function textPreview(text: string, characterLimit = synastryCardPreviewCharacterLimit) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= characterLimit) {
    return normalized;
  }

  const slice = normalized.slice(0, characterLimit);
  const lastBreak = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("? "), slice.lastIndexOf("! "));
  const trimmed = lastBreak > characterLimit * 0.55 ? slice.slice(0, lastBreak + 1) : slice.replace(/\s+\S*$/, "");

  return `${trimmed.trim()}...`;
}

function fallbackPreviewText(fallback: ContentFallback) {
  return fallback.summary
    || fallback.detailParagraphs.find((paragraph) => paragraph.trim())?.trim()
    || fallback.body?.split(/\n{2,}/).find((paragraph) => paragraph.trim())?.trim()
    || null;
}

function stripTldrPrefix(value: string) {
  return value.replace(/^TLDR:\s*/i, "").trim();
}

function normalizedArticleCopy(value: ReactNode) {
  return typeof value === "string"
    ? stripTldrPrefix(value).replace(/\s+/g, " ").trim().toLowerCase()
    : "";
}

function articleSectionFromText(heading: string, text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const body = stripTldrPrefix(normalized);
  const sentenceEnd = body.search(/[.!?](\s|$)/);
  const tldr = sentenceEnd > 30 ? body.slice(0, sentenceEnd + 1).trim() : body;

  return {
    heading,
    tldr,
    body
  };
}

function generatedArticleSections(generated: LiveGeneratedContent | null, fallbackParagraphs: string[]) {
  const generatedSections = generatedContentSections(generated);

  if (generatedSections.length > 0) {
    return generatedSections.slice(0, 4).map((section) => articleSectionFromText(section.heading, section.body));
  }

  const paragraphs = generatedContentParagraphs(generated).length > 0
    ? generatedContentParagraphs(generated)
    : fallbackParagraphs;

  return paragraphs.slice(0, 4).map((paragraph, index) => (
    articleSectionFromText(detailSectionTitle(index), paragraph)
  ));
}

function importContentRegistry(domain: ContentDomain): Promise<LazyContentRegistry> {
  if (domain === "sky") {
    return import("./content/skyRegistry");
  }

  if (domain === "relationship") {
    return import("./content/relationshipRegistry");
  }

  return import("./content/natalRegistry");
}

type ProfilePersistencePayload = {
  version: 1;
  profile: UserProfile;
  preferences: {
    theme: UiTheme;
    sunriseOrbEnabled: boolean;
    dyslexiaFriendlyFont: boolean;
    selectedLocation: LocationInput | null;
  };
  updatedAt: string;
};

const selectedLocationStorageKey = "tldrastro:selectedLocation";
const selectedThemeStorageKey = "tldrastro:theme";
const sunriseOrbStorageKey = "tldrastro:sunriseOrb";
const dyslexiaFontStorageKey = "tldrastro:dyslexiaFont";
const houseSignLabelStyleStorageKey = "tldrastro:houseSignLabelStyle";
const userProfileStorageKey = "tldrastro:userProfile";
const portalModeStorageKey = "tldrastro:portalMode";
const friendsTabStorageKey = "tldrastro:friendsTab";
const pendingSignupStorageKey = "tldrastro:pendingSignup";
const DEFAULT_SUNRISE_ORB_DEGREES = 0;
const synodicMonthDays = 29.530588;
const lunarMeanDailyMotion = 13.176358;
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
const zodiacSignGlyphs: Record<string, string> = {
  Aries: "♈",
  Taurus: "♉",
  Gemini: "♊",
  Cancer: "♋",
  Leo: "♌",
  Virgo: "♍",
  Libra: "♎",
  Scorpio: "♏",
  Sagittarius: "♐",
  Capricorn: "♑",
  Aquarius: "♒",
  Pisces: "♓"
};

const traditionalSignRulers: Record<string, string> = {
  Aries: "Mars",
  Taurus: "Venus",
  Gemini: "Mercury",
  Cancer: "Moon",
  Leo: "Sun",
  Virgo: "Mercury",
  Libra: "Venus",
  Scorpio: "Mars",
  Sagittarius: "Jupiter",
  Capricorn: "Saturn",
  Aquarius: "Saturn",
  Pisces: "Jupiter"
};
const houseLifeAreas: Record<number, string> = {
  1: "identity, body, and personal direction",
  2: "money, resources, and self-worth",
  3: "communication, siblings, and daily movement",
  4: "home, family, roots, and emotional foundation",
  5: "creativity, pleasure, romance, and children",
  6: "workflows, health, service, and maintenance",
  7: "partnerships, agreements, and direct others",
  8: "shared resources, trust, debt, and deep change",
  9: "belief, study, travel, and perspective",
  10: "career, visibility, reputation, and calling",
  11: "friends, networks, hopes, and belonging",
  12: "rest, privacy, retreat, and hidden pressure"
};
const rulerHouseRouteKeywords: Record<number, string> = {
  1: "identity, body, and personal direction",
  2: "money, resources, and self-worth",
  3: "communication, siblings, and daily movement",
  4: "home, roots, and private foundations",
  5: "creativity, pleasure, romance, and play",
  6: "routines, work, health, and maintenance",
  7: "partnership, agreements, attraction, and conflict",
  8: "intimacy, taboo, trust, and shared power",
  9: "belief, distance, study, and the bigger picture",
  10: "career, visibility, authority, and reputation",
  11: "friends, networks, audience, and future plans",
  12: "solitude, dreams, hidden pressure, and retreat"
};
const naturalHouseSigns: Record<number, string> = {
  1: "Aries",
  2: "Taurus",
  3: "Gemini",
  4: "Cancer",
  5: "Leo",
  6: "Virgo",
  7: "Libra",
  8: "Scorpio",
  9: "Sagittarius",
  10: "Capricorn",
  11: "Aquarius",
  12: "Pisces"
};
const naturalHouseLensBodies: Record<number, string> = {
  1: "The 1st house is identity, instinct, body, appearance, and the way life is met head-on.",
  2: "The 2nd house is money, resources, appetite, self-worth, and what feels stable enough to keep.",
  3: "The 3rd house is conversation, learning, siblings, local movement, and daily perception.",
  4: "The 4th house is home, family memory, emotional foundation, and what feels safe underneath everything else.",
  5: "The 5th house is pleasure, romance, creativity, children, play, and the desire to be seen.",
  6: "The 6th house is daily life. Routines, work, health, service, maintenance, and the small habits that keep everything running.",
  7: "The 7th house is partners, mirrors, agreements, attraction, conflict, and the people met face to face.",
  8: "The 8th house is intimacy, taboo, trust, shared power, secrecy, risk, and the desire to understand what people usually hide.",
  9: "The 9th house is meaning. Belief, study, travel, teaching, publishing, and the wider frame used to explain life.",
  10: "The 10th house is career, reputation, authority, visibility, and the work of becoming known.",
  11: "The 11th house is friends, networks, audience, collaboration, hopes, and the future a person wants to belong to.",
  12: "The 12th house is solitude, dreams, retreat, hidden pressure, grief, imagination, and what works behind the scenes."
};
const naturalSignLensBodies: Record<string, string> = {
  Aries: "The Aries lens adds heat, directness, urgency, and the need to act before everything is fully settled.",
  Taurus: "The Taurus lens adds embodiment, loyalty, appetite, and the need to make things real enough to trust.",
  Gemini: "The Gemini lens adds curiosity, language, movement, and the need to keep asking better questions.",
  Cancer: "The Cancer lens adds memory, protection, belonging, and the need to know what feels safe.",
  Leo: "The Leo lens adds visibility, pride, play, and the need to make the heart recognizable.",
  Virgo: "The Virgo lens adds craft, pattern, repair, and the need to make life workable through small exacting choices.",
  Libra: "The Libra lens adds relationship, proportion, aesthetics, and the need to understand life through contrast and exchange.",
  Scorpio: "The Scorpio lens adds depth, secrecy, taboo, trust, and the instinct to find the truth under the surface.",
  Sagittarius: "The Sagittarius lens adds belief, distance, teaching, travel, and the need to turn experience into meaning.",
  Capricorn: "The Capricorn lens adds structure, responsibility, ambition, and the need to build something that can hold weight.",
  Aquarius: "The Aquarius lens adds distance, systems, friendship, future-thinking, and the need to understand the pattern from above.",
  Pisces: "The Pisces lens adds permeability, imagination, longing, and the need to feel what cannot be fully explained."
};
const lifeAreaFocusOptions: Array<{
  value: LifeAreaFocus;
  label: string;
  description: string;
}> = [
  { value: "career", label: "Career", description: "Work, visibility, reputation, ambition, and direction." },
  { value: "relationships", label: "Relationships", description: "Partners, dating, intimacy, trust, and agreements." },
  { value: "friends", label: "Friends", description: "Friendships, networks, community, and belonging." },
  { value: "family", label: "Family", description: "Parents, relatives, roots, and family patterns." },
  { value: "health", label: "Health", description: "Body, routines, energy, stress, and maintenance." },
  { value: "money", label: "Money", description: "Income, resources, spending, debt, and shared assets." },
  { value: "home", label: "Home", description: "Living space, privacy, security, and emotional foundation." },
  { value: "communication", label: "Communication", description: "Conversations, messages, learning, writing, and siblings." },
  { value: "creativity", label: "Creativity", description: "Art, pleasure, romance, self-expression, and play." },
  { value: "emotional-needs", label: "Emotional needs", description: "Mood, memory, care, safety, and inner life." },
  { value: "growth", label: "Growth", description: "Study, travel, belief, perspective, and long-range development." },
  { value: "spirituality", label: "Spirituality", description: "Rest, retreat, dreams, solitude, and hidden pressure." }
];
const lifeAreaFocusValues = new Set<LifeAreaFocus>(lifeAreaFocusOptions.map((option) => option.value));
const lifeAreaFocusKeywords: Record<LifeAreaFocus, string[]> = {
  career: ["career", "work", "calling", "visibility", "reputation", "ambition", "public", "authority", "profession"],
  relationships: ["relationship", "relationships", "partner", "partnership", "partners", "dating", "romance", "love", "intimacy", "agreement", "agreements", "trust"],
  friends: ["friend", "friends", "friendship", "network", "networks", "community", "belonging", "group", "circle"],
  family: ["family", "parents", "parent", "roots", "ancestry", "relatives", "childhood"],
  health: ["health", "body", "routine", "routines", "maintenance", "service", "stress", "energy", "workflow", "workflows", "rest"],
  money: ["money", "resources", "income", "spending", "debt", "assets", "shared resources", "security", "self-worth"],
  home: ["home", "family", "roots", "living", "privacy", "foundation", "security", "belonging"],
  communication: ["communication", "conversation", "conversations", "message", "messages", "writing", "learning", "siblings", "daily movement", "language"],
  creativity: ["creativity", "creative", "pleasure", "romance", "children", "play", "art", "expression"],
  "emotional-needs": ["emotion", "emotional", "mood", "memory", "care", "need", "needs", "safety", "feeling", "feelings"],
  growth: ["growth", "study", "travel", "belief", "beliefs", "perspective", "meaning", "future", "learning"],
  spirituality: ["spirituality", "spiritual", "dream", "dreams", "retreat", "hidden", "solitude", "privacy", "rest", "unconscious"]
};
const lifeAreaFocusAstrology: Record<LifeAreaFocus, {
  houses: number[];
  planets: string[];
  aspects?: string[];
}> = {
  career: { houses: [10, 6, 2], planets: ["Sun", "Saturn", "Mars", "Mercury"], aspects: ["conjunction", "square", "trine", "sextile"] },
  relationships: { houses: [7, 5, 8], planets: ["Venus", "Mars", "Moon", "Pluto"], aspects: ["conjunction", "opposition", "square", "trine"] },
  friends: { houses: [11, 3, 7], planets: ["Venus", "Mercury", "Jupiter", "Moon"], aspects: ["conjunction", "trine", "sextile"] },
  family: { houses: [4, 10, 8], planets: ["Moon", "Saturn", "Sun", "Pluto"], aspects: ["conjunction", "opposition", "square"] },
  health: { houses: [6, 1, 12], planets: ["Moon", "Mars", "Saturn", "Mercury"], aspects: ["conjunction", "square", "opposition"] },
  money: { houses: [2, 8, 10], planets: ["Venus", "Jupiter", "Saturn", "Pluto"], aspects: ["conjunction", "square", "trine", "sextile"] },
  home: { houses: [4, 12, 2], planets: ["Moon", "Venus", "Saturn"], aspects: ["conjunction", "trine", "square"] },
  communication: { houses: [3, 9, 11], planets: ["Mercury", "Moon", "Jupiter", "Uranus"], aspects: ["conjunction", "square", "trine", "sextile"] },
  creativity: { houses: [5, 1, 9], planets: ["Sun", "Venus", "Mars", "Neptune"], aspects: ["conjunction", "trine", "sextile"] },
  "emotional-needs": { houses: [4, 8, 12, 1], planets: ["Moon", "Venus", "Saturn", "Neptune"], aspects: ["conjunction", "opposition", "square", "trine"] },
  growth: { houses: [9, 11, 1], planets: ["Jupiter", "Sun", "Saturn", "North Node"], aspects: ["conjunction", "trine", "sextile", "square"] },
  spirituality: { houses: [12, 9, 8], planets: ["Neptune", "Jupiter", "Moon", "Pluto"], aspects: ["conjunction", "trine", "sextile", "opposition"] }
};
const portalModes: PortalMode[] = ["guest", "member", "profile", "friends", "account", "settings"];
const authenticatedPortalModes: PortalMode[] = ["member", "profile", "friends", "account", "settings"];
const friendsTabs: FriendsTab[] = ["circle", "charts"];

function isPortalMode(value: unknown): value is PortalMode {
  return typeof value === "string" && portalModes.includes(value as PortalMode);
}

function parseFriendsTab(value: string | null): FriendsTab {
  return value === "charts" || value === "circle" ? value : "circle";
}

function friendsHashParts(hash: string) {
  const cleanHash = hash.replace(/^#/, "");
  const [path = "", query = ""] = cleanHash.split("?");

  return { path, params: new URLSearchParams(query) };
}

function portalModeFromHashPath(path: string): PortalMode | null {
  switch (path) {
    case "sky":
      return "member";
    case "you":
    case "profile":
      return "profile";
    case "friends":
      return "friends";
    case "account":
      return "account";
    case "settings":
      return "settings";
    default:
      if (path.startsWith("you/placement/")) {
        return "profile";
      }

      return null;
  }
}

function friendsTabFromUrl(): FriendsTab {
  try {
    const url = new URL(window.location.href);
    const searchTab = url.searchParams.get("tab");

    if (friendsTabs.includes(searchTab as FriendsTab)) {
      return parseFriendsTab(searchTab);
    }

    const { path, params } = friendsHashParts(url.hash);

    return path === "friends" ? parseFriendsTab(params.get("tab")) : "circle";
  } catch {
    return "circle";
  }
}

function isFriendsUrl() {
  try {
    const url = new URL(window.location.href);
    const { path } = friendsHashParts(url.hash);

    return url.pathname === "/friends" || path === "friends";
  } catch {
    return false;
  }
}

function portalModeFromUrl(): PortalMode | null {
  try {
    const url = new URL(window.location.href);

    if (url.pathname === "/friends") {
      return "friends";
    }

    const { path } = friendsHashParts(url.hash);

    return portalModeFromHashPath(path);
  } catch {
    return null;
  }
}

function portalHashForMode(mode: PortalMode) {
  switch (mode) {
    case "guest":
    case "member":
      return "sky";
    case "profile":
      return "you";
    case "friends":
      return "friends";
    case "account":
      return "account";
    case "settings":
      return "settings";
    default:
      return "";
  }
}

function updatePortalModeUrl(nextMode: PortalMode, mode: "push" | "replace" = "push") {
  if (nextMode === "friends") {
    updateFriendsTabUrl(initialFriendsTab(), mode);
    return;
  }

  try {
    const url = new URL(window.location.href);

    if (url.pathname === "/friends") {
      url.pathname = "/";
    }

    url.searchParams.delete("tab");
    url.hash = portalHashForMode(nextMode);

    window.history[mode === "replace" ? "replaceState" : "pushState"]({}, "", url.toString());
  } catch {
    // URL state is an enhancement; keep navigation usable if history is unavailable.
  }
}

function placementRouteIdFromUrl() {
  try {
    const url = new URL(window.location.href);
    const { path } = friendsHashParts(url.hash);
    const match = path.match(/^you\/placement\/([^/?#]+)$/);

    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function updatePlacementRouteUrl(placementId: string, mode: "push" | "replace" = "push") {
  try {
    const url = new URL(window.location.href);

    if (url.pathname === "/friends") {
      url.pathname = "/";
    }

    url.searchParams.delete("tab");
    url.hash = `you/placement/${encodeURIComponent(placementId)}`;
    window.history[mode === "replace" ? "replaceState" : "pushState"]({}, "", url.toString());
  } catch {
    // URL state is an enhancement; keep navigation usable if history is unavailable.
  }
}

function updateFriendsTabUrl(tab: FriendsTab, mode: "push" | "replace" = "push") {
  try {
    const url = new URL(window.location.href);

    if (url.pathname === "/friends") {
      url.searchParams.set("tab", tab);
    } else {
      const { path, params } = friendsHashParts(url.hash);
      const nextParams = path === "friends" ? params : new URLSearchParams();
      nextParams.set("tab", tab);
      url.hash = `friends?${nextParams.toString()}`;
    }

    window.history[mode === "replace" ? "replaceState" : "pushState"]({}, "", url.toString());
  } catch {
    // URL state is an enhancement; keep the tab usable if history is unavailable.
  }
}

function storePortalMode(mode: PortalMode) {
  try {
    window.localStorage.setItem(portalModeStorageKey, mode);
  } catch {
    return;
  }
}

function getStoredFriendsTab() {
  try {
    return parseFriendsTab(window.localStorage.getItem(friendsTabStorageKey));
  } catch {
    return "circle";
  }
}

function initialFriendsTab(): FriendsTab {
  return isFriendsUrl() ? friendsTabFromUrl() : getStoredFriendsTab();
}

function storeFriendsTab(tab: FriendsTab) {
  try {
    window.localStorage.setItem(friendsTabStorageKey, tab);
  } catch {
    return;
  }
}

function isAuthenticatedPortalMode(value: PortalMode): value is Exclude<PortalMode, "guest"> {
  return authenticatedPortalModes.includes(value);
}

function getStoredPortalMode() {
  try {
    const savedMode = window.localStorage.getItem(portalModeStorageKey);

    return isPortalMode(savedMode) ? savedMode : null;
  } catch {
    return null;
  }
}

function getInitialPortalMode(): PortalMode {
  const urlMode = portalModeFromUrl();

  return urlMode ?? getStoredPortalMode() ?? getInitialAccountMode();
}

function authenticatedLandingMode(currentMode: PortalMode, restoredMode: PortalMode | null): PortalMode {
  const urlMode = portalModeFromUrl();

  if (urlMode && isAuthenticatedPortalMode(urlMode)) {
    return urlMode;
  }

  if (isAuthenticatedPortalMode(currentMode)) {
    return currentMode;
  }

  if (restoredMode && isAuthenticatedPortalMode(restoredMode)) {
    return restoredMode;
  }

  return "profile";
}

function unauthenticatedLandingMode(currentMode: PortalMode): PortalMode {
  const urlMode = portalModeFromUrl();

  if (urlMode === "friends" || currentMode === "friends") {
    return "friends";
  }

  if (urlMode === "settings") {
    return "settings";
  }

  if (urlMode === "profile") {
    return "profile";
  }

  if (urlMode === "member" || currentMode === "member") {
    return "guest";
  }

  if (currentMode === "account" || currentMode === "settings") {
    return "profile";
  }

  return currentMode;
}

const defaultTransitForm: TransitForm = {
  name: "",
  birthPlace: "",
  birthLocation: null,
  birthMonth: "",
  birthDay: "",
  birthYear: "",
  birthHour: "",
  birthMinute: "",
  birthMeridiem: "AM",
  unknownBirthTime: false,
  currentLocation: "",
  currentLocationData: null,
  chartDate: new Date().toISOString().slice(0, 10)
};

const defaultManualChartForm: ManualChartForm = {
  chartType: "person",
  displayName: "",
  relationshipType: "friend",
  birthDate: "",
  birthTime: "12:00",
  birthTimeUnknown: false,
  birthPlace: "",
  birthLocation: null
};

const chartFormCopy: Record<ManualChartType, {
  title: string;
  editTitle: string;
  subtitle: string;
  editSubtitle: string;
  nameLabel: string;
  namePlaceholder: string;
  dateLabel: string;
  timeLabel: string;
  placeLabel: string;
  placePlaceholder: string;
  unknownTime: string;
  submit: string;
  savingSubmit: string;
  saveSubmit: string;
  requiredMessage: string;
  timeMessage: string;
}> = {
  person: {
    title: "Add chart",
    editTitle: "Edit chart",
    subtitle: "Enter birth details to save this chart.",
    editSubtitle: "Update birth details for this saved chart.",
    nameLabel: "Name",
    namePlaceholder: "Their name",
    dateLabel: "Birth date",
    timeLabel: "Birth time",
    placeLabel: "Birth place",
    placePlaceholder: "City, Country",
    unknownTime: "I don't know their birth time.",
    submit: "Add chart",
    savingSubmit: "Saving...",
    saveSubmit: "Save chart",
    requiredMessage: "Add a name, birth date, and birth place.",
    timeMessage: "Add a birth time, or mark it unknown."
  },
  event: {
    title: "Add event chart",
    editTitle: "Edit event chart",
    subtitle: "Enter the event details to save this chart.",
    editSubtitle: "Update event details for this saved chart.",
    nameLabel: "Event name",
    namePlaceholder: "Event name",
    dateLabel: "Event date",
    timeLabel: "Event time",
    placeLabel: "Event place",
    placePlaceholder: "City, Country",
    unknownTime: "I don't know the event time.",
    submit: "Add event chart",
    savingSubmit: "Saving...",
    saveSubmit: "Save event chart",
    requiredMessage: "Add an event name, event date, and event place.",
    timeMessage: "Add an event time, or mark it unknown."
  }
};

const relationshipTypeLabels: Record<string, string> = {
  event: "Event",
  family: "Family",
  friend: "Friendship",
  other: "Connection",
  partner: "Partnership",
  work: "Work"
};

const defaultChartSettings: ChartSettings = {
  houseSystem: "Whole House",
  zodiac: "Tropical",
  aspects: "Standard",
  houseSignLabelStyle: "text",
  lifeAreaFocus: []
};

function normalizeHouseSignLabelStyle(value: unknown): HouseSignLabelStyle {
  return value === "glyph" ? "glyph" : "text";
}

function normalizeChartSettings(settings?: Partial<ChartSettings> | null): ChartSettings {
  const lifeAreaFocus = Array.isArray(settings?.lifeAreaFocus)
    ? settings.lifeAreaFocus.filter((area): area is LifeAreaFocus => lifeAreaFocusValues.has(area as LifeAreaFocus))
    : [];

  return {
    houseSystem: "Whole House",
    zodiac: "Tropical",
    aspects: settings?.aspects === "Tight" ? "Tight" : "Standard",
    houseSignLabelStyle: normalizeHouseSignLabelStyle(settings?.houseSignLabelStyle),
    lifeAreaFocus: Array.from(new Set(lifeAreaFocus))
  };
}

function apiSettingsFromChartSettings(settings?: Partial<ChartSettings> | null): TldrAstroChartSettings {
  const normalized = normalizeChartSettings(settings);

  return {
    houseSystem: "whole_sign" as const,
    zodiac: "tropical" as const,
    aspectProfile: normalized.aspects === "Tight" ? "tight" as const : "standard" as const
  };
}

function apiSubjectFromUserChart(
  profile: UserProfile,
  chart: UserChart | undefined,
  settings?: Partial<ChartSettings> | null
): TldrAstroSubject | null {
  const birthDate = validChartBirthDate(chart);
  const birthCity = validChartBirthCity(chart);
  const birthTime = validChartBirthTime(chart);
  const birthLocation = chart?.birthLocation
    ? withTimeZone(chart.birthLocation)
    : birthCity
      ? locationFromLabel(birthCity)
      : null;

  if (!birthDate || !birthTime || !birthLocation) {
    return null;
  }

  const timeKnown = birthTime !== "Time unknown";

  return {
    name: profile.name,
    datetime: {
      date: birthDate,
      time: timeKnown ? displayTimeToTwentyFourHour(birthTime) : "12:00",
      timeKnown,
      timeZone: birthLocation.timeZone
    },
    location: birthLocation,
    settings: apiSettingsFromChartSettings(settings)
  };
}

function apiSubjectFromManualChart(
  chart: ManualChart | null | undefined,
  settings?: Partial<ChartSettings> | null
): TldrAstroSubject | null {
  if (!chart || !chart.birthDate || !chart.birthLocation) {
    return null;
  }

  const birthLocation = withTimeZone(chart.birthLocation);
  const timeKnown = !chart.birthTimeUnknown && Boolean(chart.birthTime);

  return {
    name: chart.displayName,
    datetime: {
      date: chart.birthDate,
      time: timeKnown ? displayTimeToTwentyFourHour(chart.birthTime) : "12:00",
      timeKnown,
      timeZone: birthLocation.timeZone
    },
    location: birthLocation,
    settings: apiSettingsFromChartSettings(settings)
  };
}

function createBlankTransitForm(): TransitForm {
  return {
    ...defaultTransitForm,
    chartDate: new Date().toISOString().slice(0, 10)
  };
}

const defaultSignupForm: SignupForm = {
  fullName: "",
  email: "",
  password: "",
  birthDate: "",
  birthTime: "",
  unknownBirthTime: false,
  birthCity: "",
  birthLocation: null
};

function isLocationInput(value: unknown): value is LocationInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const location = value as Partial<LocationInput>;

  return (
    typeof location.label === "string" &&
    typeof location.latitude === "number" &&
    typeof location.longitude === "number"
  );
}

function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Partial<UserProfile>;

  return typeof profile.id === "string"
    && typeof profile.name === "string"
    && typeof profile.email === "string"
    && Array.isArray(profile.charts);
}

function isProfilePersistencePayload(value: unknown): value is ProfilePersistencePayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<ProfilePersistencePayload>;

  return payload.version === 1 && isUserProfile(payload.profile);
}

function createProfilePersistencePayload({
  profile,
  theme,
  sunriseOrbEnabled,
  dyslexiaFriendlyFont,
  selectedLocation
}: {
  profile: UserProfile;
  theme: UiTheme;
  sunriseOrbEnabled: boolean;
  dyslexiaFriendlyFont: boolean;
  selectedLocation: LocationInput | null;
}): ProfilePersistencePayload {
  return {
    version: 1,
    profile,
    preferences: {
      theme,
      sunriseOrbEnabled,
      dyslexiaFriendlyFont,
      selectedLocation
    },
    updatedAt: new Date().toISOString()
  };
}

function isSignupForm(value: unknown): value is SignupForm {
  if (!value || typeof value !== "object") {
    return false;
  }

  const form = value as Partial<SignupForm>;

  return typeof form.fullName === "string"
    && typeof form.email === "string"
    && typeof form.password === "string"
    && typeof form.birthDate === "string"
    && typeof form.birthTime === "string"
    && typeof form.unknownBirthTime === "boolean"
    && typeof form.birthCity === "string";
}

function dateInputValue(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateFromInput(value: string) {
  return new Date(`${value}T12:00:00`);
}

function timeInZoneForInput(date: Date, timeZone = browserTimeZone()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).formatToParts(date);
  const valueFor = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = valueFor("hour") || "12";
  const minute = valueFor("minute") || "00";
  const meridiem = valueFor("dayPeriod").toUpperCase() === "PM" ? "PM" : "AM";

  return `${hour}:${minute} ${meridiem}`;
}

function skyDateTimeFromInput(value: string, location: LocationInput, now: Date = new Date()) {
  const resolvedLocation = withTimeZone(location);
  const localTime = timeInZoneForInput(now, resolvedLocation.timeZone);

  return zonedDateTimeToUtc(value, localTime, resolvedLocation.timeZone);
}

function formatSkyDate(value: string) {
  return dateFromInput(value).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

function formatSkyFullChartDate(value: string) {
  return dateFromInput(value).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function formatSkyHeroTitle(value: string, today = new Date()) {
  const selectedDay = localDayStart(dateFromInput(value));
  const todayDay = localDayStart(today);
  const dayDelta = Math.round((selectedDay.getTime() - todayDay.getTime()) / 86_400_000);

  if (dayDelta === -1) return "Yesterday, simple.";
  if (dayDelta === 0) return "Today, simple.";
  if (dayDelta === 1) return "Tomorrow, simple.";
  return "The sky, simple.";
}

function formatSkyHeaderDateLabel(value: string, today = new Date()) {
  const selectedDay = localDayStart(dateFromInput(value));
  const todayDay = localDayStart(today);
  const dayDelta = Math.round((selectedDay.getTime() - todayDay.getTime()) / 86_400_000);

  if (dayDelta === 0) return "Today";
  if (dayDelta === 1) return "Tomorrow";

  return dateFromInput(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function formatPlacementDegree(position?: PlanetPosition) {
  if (!position) {
    return "";
  }

  return formatPlanetDegree(position);
}

function formatBriefPlacementDegree(position?: PlanetPosition) {
  if (!position) {
    return "";
  }

  return `${Math.round(position.degree)}°`;
}

function compactSkyChicletSign(label: string) {
  return label === "Sagittarius" ? "Sag." : label;
}

function zodiacLongitude(position?: PlanetPosition) {
  if (!position) {
    return 0;
  }

  const signIndex = zodiacSigns.indexOf(position.sign);

  return (Math.max(signIndex, 0) * 30 + position.degree) % 360;
}

function positionFromLongitude({
  planet,
  glyph,
  longitude,
  theme
}: {
  planet: string;
  glyph: string;
  longitude: number;
  theme: string;
}): PlanetPosition {
  const normalizedLongitude = normalizedAngle(longitude);
  const sign = zodiacSignForLongitude(normalizedLongitude);

  return {
    planet,
    glyph,
    sign,
    signGlyph: zodiacGlyphText(sign),
    degree: normalizedLongitude % 30,
    house: 0,
    motion: "direct",
    theme
  };
}

function normalizedAngle(value: number) {
  return ((value % 360) + 360) % 360;
}

function angularDistance(first: number, second: number) {
  const difference = Math.abs(normalizedAngle(first - second));
  return difference > 180 ? 360 - difference : difference;
}

function zodiacSignForLongitude(longitude: number) {
  return zodiacSigns[Math.floor(normalizedAngle(longitude) / 30)] ?? "Aries";
}

function nextMoonEvent(sky: SkySnapshot) {
  if (sky.moonEvent) {
    return {
      name: sky.moonEvent.name,
      days: sky.moonEvent.days,
      sign: sky.moonEvent.sign,
      occursAt: new Date(sky.moonEvent.occursAt)
    };
  }

  const sun = sky.positions.find((position) => position.planet === "Sun");
  const moon = sky.positions.find((position) => position.planet === "Moon");
  const phaseAngle = normalizedAngle(zodiacLongitude(moon) - zodiacLongitude(sun));
  const nextEvent = phaseAngle < 180 ? "Full Moon" : "New Moon";
  const degreesUntilEvent = nextEvent === "Full Moon" ? 180 - phaseAngle : 360 - phaseAngle;
  const daysUntilEvent = Math.max(0, (degreesUntilEvent / 360) * synodicMonthDays);
  const generatedAt = new Date(sky.generatedAt);
  const baseTime = Number.isNaN(generatedAt.getTime()) ? new Date() : generatedAt;
  const occursAt = new Date(baseTime.getTime() + daysUntilEvent * 86_400_000);
  const moonEventLongitude = zodiacLongitude(moon) + daysUntilEvent * lunarMeanDailyMotion;

  return {
    name: nextEvent,
    days: daysUntilEvent,
    sign: zodiacSignForLongitude(moonEventLongitude),
    occursAt
  };
}

function formatMoonCountdown(days: number) {
  if (days < 0.5) {
    return "less than a day";
  }

  if (days < 1.5) {
    return "about 1 day";
  }

  return `${Math.round(days)} days`;
}

function zodiacGlyphText(sign: string) {
  const glyph = zodiacSignGlyphs[sign];

  return glyph ? `${glyph}\uFE0E` : "";
}

function localDayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function lunationCountdownLabel(selectedDate: Date, exactAt: Date) {
  const daysUntil = Math.max(0, Math.round((localDayStart(exactAt).getTime() - localDayStart(selectedDate).getTime()) / 86_400_000));

  if (daysUntil === 0) {
    return "TODAY";
  }

  if (daysUntil === 1) {
    return "TOMORROW";
  }

  return `IN ${daysUntil} DAYS`;
}

function formatLunationDateTime(exactAt: Date) {
  const date = exactAt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
  const time = exactAt.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  });

  return `${date} · ${time}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function calendarDaysFor(month: Date) {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(firstOfMonth);

  start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function getInitialLocation() {
  try {
    const savedLocation = window.localStorage.getItem(selectedLocationStorageKey);

    if (!savedLocation) {
      return {
        location: defaultLocation,
        hasSavedLocation: false
      };
    }

    const parsedLocation = JSON.parse(savedLocation) as unknown;

    if (isLocationInput(parsedLocation)) {
      return {
        location: withTimeZone(parsedLocation),
        hasSavedLocation: true
      };
    }

    return {
      location: defaultLocation,
      hasSavedLocation: false
    };
  } catch {
    return {
      location: defaultLocation,
      hasSavedLocation: false
    };
  }
}

function getInitialTheme(): UiTheme {
  try {
    const savedTheme = window.localStorage.getItem(selectedThemeStorageKey);

    return savedTheme === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function getInitialSunriseOrb() {
  try {
    const savedValue = window.localStorage.getItem(sunriseOrbStorageKey);

    if (savedValue === "true" || savedValue === "on") {
      return true;
    }

    if (savedValue === "false" || savedValue === "off") {
      return false;
    }

    return true;
  } catch {
    return true;
  }
}

function getInitialDyslexiaFont() {
  try {
    const savedValue = window.localStorage.getItem(dyslexiaFontStorageKey);

    return savedValue === "true" || savedValue === "on";
  } catch {
    return false;
  }
}

function getInitialHouseSignLabelStyle(): HouseSignLabelStyle {
  try {
    return normalizeHouseSignLabelStyle(window.localStorage.getItem(houseSignLabelStyleStorageKey));
  } catch {
    return "text";
  }
}

function getInitialUserProfile(): UserProfile | null {
  try {
    const savedProfile = window.localStorage.getItem(userProfileStorageKey);

    if (!savedProfile) {
      return null;
    }

    const parsedProfile = JSON.parse(savedProfile) as unknown;

    return isUserProfile(parsedProfile) ? parsedProfile : null;
  } catch {
    return null;
  }
}

function profileForAuthAccount(profile: UserProfile, account: AuthAccount): UserProfile {
  return {
    ...profile,
    id: account.id,
    email: account.email || profile.email,
    name: profile.name || account.name,
    provider: normalizeSignupProvider(account.provider, profile.provider),
    avatarUrl: account.avatarUrl ?? profile.avatarUrl
  };
}

function zodiacFromBirthDate(value: string) {
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const monthValue = isoMatch?.[2] ?? slashMatch?.[1] ?? "";
  const dayValue = isoMatch?.[3] ?? slashMatch?.[2] ?? "";
  const month = Number(monthValue);
  const day = Number(dayValue);

  if (!month || !day) {
    return "Gemini";
  }

  const signStarts = [
    { sign: "Capricorn", month: 1, day: 1 },
    { sign: "Aquarius", month: 1, day: 20 },
    { sign: "Pisces", month: 2, day: 19 },
    { sign: "Aries", month: 3, day: 21 },
    { sign: "Taurus", month: 4, day: 20 },
    { sign: "Gemini", month: 5, day: 21 },
    { sign: "Cancer", month: 6, day: 21 },
    { sign: "Leo", month: 7, day: 23 },
    { sign: "Virgo", month: 8, day: 23 },
    { sign: "Libra", month: 9, day: 23 },
    { sign: "Scorpio", month: 10, day: 23 },
    { sign: "Sagittarius", month: 11, day: 22 },
    { sign: "Capricorn", month: 12, day: 22 }
  ];

  return signStarts.reduce((currentSign, item) => (
    month > item.month || (month === item.month && day >= item.day) ? item.sign : currentSign
  ), "Capricorn");
}

function planetSignFromSky(sky: SkySnapshot, planet: string) {
  return sky.positions.find((position) => position.planet === planet)?.sign ?? "";
}

function natalBigThreeFromSky(sky: SkySnapshot, unknownBirthTime: boolean) {
  return {
    sun: planetSignFromSky(sky, "Sun") || sky.positions[0]?.sign || "Sun pending",
    moon: planetSignFromSky(sky, "Moon") || "Moon pending",
    rising: unknownBirthTime ? "Rising pending" : sky.ascendant
  };
}

function validChartBirthDate(chart?: UserChart) {
  const value = chart?.birthDate?.trim() ?? "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const [, month = "", day = "", year = ""] = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/) ?? [];

  if (!month || !day || !year) {
    return "";
  }

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function validChartBirthCity(chart?: UserChart) {
  return chart?.birthCity && chart.birthCity !== "Birth city needed" ? chart.birthCity : "";
}

function validChartBirthTime(chart?: UserChart) {
  return chart?.birthTime && chart.birthTime !== "Birth time needed" ? chart.birthTime : "";
}

function chartNameFromProfile(name: string) {
  const trimmedName = name.trim();

  return trimmedName ? `${trimmedName}'s birth chart` : "My birth chart";
}

function splitSignupBirthTime(value: string): SignupTimeParts {
  const [, hour = "", minute = "", meridiem = "AM"] = value.match(/^(\d{1,2}):(\d{0,2})\s?(AM|PM)$/i) ?? [];

  return {
    hour,
    minute,
    meridiem: meridiem.toUpperCase() === "PM" ? "PM" : "AM"
  };
}

function formatSignupBirthTime({ hour, minute, meridiem }: SignupTimeParts) {
  const cleanHour = hour.replace(/\D/g, "").slice(0, 2);
  const cleanMinute = minute.replace(/\D/g, "").slice(0, 2);

  if (!cleanHour && !cleanMinute) {
    return "";
  }

  return `${cleanHour}:${cleanMinute} ${meridiem}`;
}

function splitSignupBirthDate(value: string): SignupDateParts {
  const [, year = "", month = "", day = ""] = value.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];

  return { month, day, year };
}

function formatSignupBirthDate({ month, day, year }: SignupDateParts) {
  const cleanMonth = month.replace(/\D/g, "").slice(0, 2);
  const cleanDay = day.replace(/\D/g, "").slice(0, 2);
  const cleanYear = year.replace(/\D/g, "").slice(0, 4);

  if (cleanMonth.length !== 2 || cleanDay.length !== 2 || cleanYear.length !== 4) {
    return "";
  }

  return `${cleanYear}-${cleanMonth}-${cleanDay}`;
}

function formatProfileBirthDate(value: string) {
  const { month, day, year } = splitSignupBirthDate(value);

  return month && day && year ? `${month}/${day}/${year}` : value;
}

function formatProfileBirthDateLong(value: string) {
  const [, year = "", month = "", day = ""] = value.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  if (!year || Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function twentyFourHourTimeToDisplay(value: string) {
  const [, rawHour = "", rawMinute = ""] = value.match(/^(\d{1,2}):(\d{2})/) ?? [];
  const hour = Number(rawHour);

  if (!rawHour || Number.isNaN(hour)) {
    return "12:00 PM";
  }

  const meridiem = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${rawMinute || "00"} ${meridiem}`;
}

function displayTimeToTwentyFourHour(value: string | null | undefined) {
  if (!value) {
    return "12:00";
  }

  const [, rawHour = "", rawMinute = "00", meridiem = "AM"] = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i) ?? [];
  const hour = Number(rawHour);

  if (!rawHour || Number.isNaN(hour)) {
    return value.slice(0, 5);
  }

  const hour24 = meridiem.toUpperCase() === "PM"
    ? (hour % 12) + 12
    : hour % 12;

  return `${String(hour24).padStart(2, "0")}:${rawMinute}`;
}

function manualChartFormFromChart(chart?: ManualChart | null): ManualChartForm {
  if (!chart) {
    return defaultManualChartForm;
  }

  return {
    chartType: chart.chartType ?? (chart.relationshipType === "event" ? "event" : "person"),
    displayName: chart.displayName,
    relationshipType: chart.relationshipType || "friend",
    birthDate: chart.birthDate,
    birthTime: displayTimeToTwentyFourHour(chart.birthTime),
    birthTimeUnknown: chart.birthTimeUnknown,
    birthPlace: chart.birthPlace,
    birthLocation: chart.birthLocation
  };
}

function manualChartBigThree(chart: ManualChart) {
  if (!chart.natalChart) {
    return {
      sun: zodiacFromBirthDate(chart.birthDate),
      moon: "Moon pending",
      rising: chart.birthTimeUnknown ? "Rising pending" : "Rising pending"
    };
  }

  return natalBigThreeFromSky(chart.natalChart, chart.birthTimeUnknown);
}

function manualChartSubtitle(chart: ManualChart) {
  const birthTime = chart.birthTimeUnknown ? "Time unknown" : twentyFourHourTimeToDisplay(chart.birthTime ?? "12:00");
  const dateTimePlace = `${formatProfileBirthDateLong(chart.birthDate)} · ${birthTime} · ${compactCityLabel(chart.birthPlace)}`;

  return chart.chartType === "event" ? `Event · ${dateTimePlace}` : dateTimePlace;
}

function manualChartNeedsBirthTime(chart: ManualChart) {
  return chart.chartType !== "event" && (chart.birthTimeUnknown || !chart.birthTime);
}

function nextManualChartBirthday(chart: ManualChart, currentDateValue: string) {
  const [, rawYear = "", rawMonth = "", rawDay = ""] = chart.birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];
  const currentDate = new Date(currentDateValue);

  if (chart.chartType === "event" || !rawYear || Number.isNaN(currentDate.getTime())) {
    return null;
  }

  const month = Number(rawMonth);
  const day = Number(rawDay);
  const currentDay = localDayStart(currentDate);
  let birthday = new Date(currentDay.getFullYear(), month - 1, day);

  if (birthday.getTime() < currentDay.getTime()) {
    birthday = new Date(currentDay.getFullYear() + 1, month - 1, day);
  }

  const daysUntil = Math.round((birthday.getTime() - currentDay.getTime()) / 86_400_000);

  return {
    chart,
    date: birthday,
    daysUntil
  };
}

function upcomingBirthdayChiclet(charts: ManualChart[], currentDateValue: string) {
  const birthdays = charts.flatMap((chart) => {
    const birthday = nextManualChartBirthday(chart, currentDateValue);

    return birthday && birthday.daysUntil >= 0 && birthday.daysUntil < 35 ? [birthday] : [];
  });

  return birthdays.sort((first, second) => first.daysUntil - second.daysUntil)[0] ?? null;
}

function birthdayCountdownLabel(daysUntil: number) {
  if (daysUntil === 0) {
    return "today";
  }

  if (daysUntil === 1) {
    return "tomorrow";
  }

  return `in ${daysUntil} days`;
}

function birthdayDateLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(date);
}

function createUserProfile(form: SignupForm, provider: SignupProvider, account?: AuthAccount | null): UserProfile {
  const name = form.fullName.trim() || account?.name || (provider === "email" ? "New stargazer" : `${providerLabel(provider)} account`);
  const email = account?.email || form.email.trim() || `${provider}@tldrastro.local`;
  const resolvedProvider = normalizeSignupProvider(account?.provider, provider);
  const sun = zodiacFromBirthDate(form.birthDate);
  const chart: UserChart = {
    id: `chart-${Date.now()}`,
    name: chartNameFromProfile(name),
    type: "Birth chart",
    birthDate: form.birthDate || "Birth date needed",
    birthTime: form.unknownBirthTime ? "Time unknown" : form.birthTime || "Birth time needed",
    birthCity: form.birthCity.trim() || "Birth city needed",
    birthLocation: form.birthLocation
  };

  return {
    id: account?.id ?? `user-${Date.now()}`,
    name,
    email,
    provider: resolvedProvider,
    avatarUrl: account?.avatarUrl,
    sun,
    moon: "Moon pending",
    rising: form.unknownBirthTime || !form.birthTime ? "Rising pending" : "Rising pending",
    settings: defaultChartSettings,
    charts: [chart]
  };
}

function normalizeSignupProvider(value: string | undefined, fallback: SignupProvider): SignupProvider {
  return value === "email" || value === "google" ? value : fallback;
}

function readPendingSignupForm() {
  try {
    const savedForm = window.localStorage.getItem(pendingSignupStorageKey);

    if (!savedForm) {
      return defaultSignupForm;
    }

    const parsedForm = JSON.parse(savedForm) as unknown;

    return isSignupForm(parsedForm) ? parsedForm : defaultSignupForm;
  } catch {
    return defaultSignupForm;
  }
}

function savePendingSignupForm(form: SignupForm) {
  try {
    window.localStorage.setItem(pendingSignupStorageKey, JSON.stringify(form));
  } catch {
    return;
  }
}

function clearPendingSignupForm() {
  try {
    window.localStorage.removeItem(pendingSignupStorageKey);
  } catch {
    return;
  }
}

function providerLabel(provider: SignupProvider) {
  const labels: Record<SignupProvider, string> = {
    email: "Email",
    google: "Google"
  };

  return labels[provider];
}

function profileFirstName(name: string, email: string) {
  const source = name.trim() || email.split("@")[0] || "Profile";
  return source.split(/\s+/).filter(Boolean)[0] ?? "Profile";
}

function compactCityLabel(city: string) {
  const stateMap: Record<string, string> = {
    Alabama: "AL",
    Alaska: "AK",
    Arizona: "AZ",
    Arkansas: "AR",
    California: "CA",
    Colorado: "CO",
    Connecticut: "CT",
    Delaware: "DE",
    Florida: "FL",
    Georgia: "GA",
    Hawaii: "HI",
    Idaho: "ID",
    Illinois: "IL",
    Indiana: "IN",
    Iowa: "IA",
    Kansas: "KS",
    Kentucky: "KY",
    Louisiana: "LA",
    Maine: "ME",
    Maryland: "MD",
    Massachusetts: "MA",
    Michigan: "MI",
    Minnesota: "MN",
    Mississippi: "MS",
    Missouri: "MO",
    Montana: "MT",
    Nebraska: "NE",
    Nevada: "NV",
    "New Hampshire": "NH",
    "New Jersey": "NJ",
    "New Mexico": "NM",
    "New York": "NY",
    "North Carolina": "NC",
    "North Dakota": "ND",
    Ohio: "OH",
    Oklahoma: "OK",
    Oregon: "OR",
    Pennsylvania: "PA",
    "Rhode Island": "RI",
    "South Carolina": "SC",
    "South Dakota": "SD",
    Tennessee: "TN",
    Texas: "TX",
    Utah: "UT",
    Vermont: "VT",
    Virginia: "VA",
    Washington: "WA",
    "West Virginia": "WV",
    Wisconsin: "WI",
    Wyoming: "WY"
  };
  const withoutCountry = city.replace(/,\s*United States$/i, "").trim();

  return withoutCountry
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, index) => (index > 0 && stateMap[part] ? stateMap[part] : part))
    .join(", ");
}

function readableNameList(names: string[]) {
  const cleanNames = names.map((name) => name.trim()).filter(Boolean);

  if (cleanNames.length <= 1) {
    return cleanNames[0] ?? "";
  }

  if (cleanNames.length === 2) {
    return `${cleanNames[0]} and ${cleanNames[1]}`;
  }

  return `${cleanNames.slice(0, -1).join(", ")}, and ${cleanNames[cleanNames.length - 1]}`;
}

function chartSetupSteps(profile: UserProfile) {
  const primaryChart = profile.charts[0];
  const birthDate = validChartBirthDate(primaryChart);
  const birthTime = Boolean(primaryChart?.birthTime && primaryChart.birthTime !== "Birth time needed");
  const birthCity = Boolean(primaryChart?.birthCity && primaryChart.birthCity !== "Birth city needed");
  const currentCity = Boolean(profile.currentLocation?.trim());

  return [
    { label: "Birth date", complete: Boolean(birthDate) },
    { label: "Birth time", complete: birthTime },
    { label: "Birth city", complete: birthCity },
    { label: "Current city", complete: currentCity }
  ];
}

function hasCompleteChartSetup(profile: UserProfile) {
  return chartSetupSteps(profile).every((step) => step.complete);
}

function chartFlowStepsLeft(profile: UserProfile) {
  const primaryChart = profile.charts[0];
  const savedBirthDate = validChartBirthDate(primaryChart);
  const savedBirthCity = Boolean(primaryChart?.birthCity && primaryChart.birthCity !== "Birth city needed");
  const birthInfoComplete = Boolean(savedBirthDate && savedBirthCity);
  const currentCityComplete = Boolean(profile.currentLocation?.trim());

  return [
    birthInfoComplete ? "" : "Birth information",
    currentCityComplete ? "" : "Current city"
  ].filter(Boolean).length;
}

function SkyNavIcon({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 3.75 14.35 9.65 20.25 12 14.35 14.35 12 20.25 9.65 14.35 3.75 12 9.65 9.65 12 3.75Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SmileNavIcon({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M8.5 14q3.5 3 7 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M9.5 10h.01" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M14.5 10h.01" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function FriendsNavIcon({ size = 20 }: { size?: number }) {
  return (
    <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 28 18" width={size} xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="9" r="6.25" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="9" r="6.25" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function BrandAsterisk({ size = 28 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g stroke="currentColor" strokeWidth="13" strokeLinecap="round">
        <line x1="50" y1="87" x2="50" y2="13" />
        <line x1="82.04" y1="68.5" x2="17.96" y2="31.5" />
        <line x1="82.04" y1="31.5" x2="17.96" y2="68.5" />
      </g>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="google-mark" aria-hidden="true" viewBox="0 0 20 20" focusable="false">
      <path d="M19.6 10.23c0-.71-.06-1.39-.18-2.05H10v3.87h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.31 2.98-7.35Z" fill="#4285F4" />
      <path d="M10 20c2.7 0 4.96-.9 6.62-2.42l-3.23-2.51c-.9.6-2.04.95-3.39.95a5.9 5.9 0 0 1-5.6-4.12H1.06v2.59A9.99 9.99 0 0 0 10 20Z" fill="#34A853" />
      <path d="M4.4 11.9a6.01 6.01 0 0 1 0-3.8V5.51H1.06a10 10 0 0 0 0 8.98L4.4 11.9Z" fill="#FBBC04" />
      <path d="M10 3.98c1.47 0 2.79.5 3.82 1.49l2.87-2.86A9.6 9.6 0 0 0 10 0 9.99 9.99 0 0 0 1.06 5.51L4.4 8.1A5.9 5.9 0 0 1 10 3.98Z" fill="#E94235" />
    </svg>
  );
}

function detailMetaRows(meta: string) {
  const parts = meta.split("·").map((part) => part.trim()).filter(Boolean);

  if (parts.length === 0) {
    return [{ label: "Context", value: "Field guide" }];
  }

  return parts.map((part, index) => {
    const lower = part.toLowerCase();
    const label = lower.includes("orb")
      ? "Orb"
      : lower.includes("house")
        ? "House"
        : lower.includes("chapter")
          ? "Chapter"
      : lower === "today" || lower.includes("about ") || lower.includes("until ") || lower.includes("near exact")
        ? "Duration"
        : index === 0
          ? "Signature"
          : "Duration";

    return { label, value: part };
  });
}

const averageDailyMotion: Record<string, number> = {
  Sun: 0.9856,
  Moon: 13.176,
  Mercury: 1.25,
  Venus: 1,
  Mars: 0.52,
  Jupiter: 0.083,
  Saturn: 0.033,
  Uranus: 0.012,
  Neptune: 0.006,
  Pluto: 0.004,
  "North Node": 0.053,
  "True Node": 0.053
};

function daysFrom(dateValue: string, days: number) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  date.setUTCDate(date.getUTCDate() + Math.round(days));
  return date;
}

function dateFromOffsetDays(dateValue: string, days: number) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return new Date(date.getTime() + days * 86_400_000);
}

function sameLocalDate(first: Date, second: Date) {
  return first.getUTCFullYear() === second.getUTCFullYear()
    && first.getUTCMonth() === second.getUTCMonth()
    && first.getUTCDate() === second.getUTCDate();
}

function formatEditorialDate(date: Date, includeYear = false) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
    ...(includeYear ? { year: "numeric" } : {})
  }).format(date);
}

function formatEditorialTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    timeZone: "UTC"
  }).format(date).replace(":00", "");
}

function formatEditorialDateRange(start: Date, end: Date, referenceDate = new Date()) {
  if (sameLocalDate(start, end)) {
    const dateLabel = sameLocalDate(start, referenceDate) ? "Today" : formatEditorialDate(start);
    return `${dateLabel} · ${formatEditorialTime(start)} - ${formatEditorialTime(end)}`;
  }

  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();
  const showYear = !sameYear || start.getUTCFullYear() !== referenceDate.getUTCFullYear();

  if (sameMonth) {
    return `${formatEditorialDate(start, showYear)} - ${end.getUTCDate()}${showYear ? `, ${end.getUTCFullYear()}` : ""}`;
  }

  if (sameYear) {
    return `${formatEditorialDate(start, showYear)} - ${formatEditorialDate(end, showYear)}`;
  }

  return `${formatEditorialDate(start, true)} - ${formatEditorialDate(end, true)}`;
}

function formatTransitRange(start: Date, end: Date) {
  return formatEditorialDateRange(start, end);
}

function dateFromDurationInput(value: string | Date) {
  const date = typeof value === "string"
    ? new Date(`${value.slice(0, 10)}T00:00:00Z`)
    : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function calendarMonthDiff(start: Date, end: Date) {
  let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth());

  if (end.getUTCDate() < start.getUTCDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}

function getDurationParts(startInput: string | Date, endInput: string | Date) {
  const start = dateFromDurationInput(startInput);
  const end = dateFromDurationInput(endInput);

  if (!start || !end || end.getTime() < start.getTime()) {
    return null;
  }

  const days = Math.floor((dateOnly(end) - dateOnly(start)) / 86_400_000);
  const months = days >= 30 ? Math.max(1, calendarMonthDiff(start, end)) : 0;
  const normalizedMonths = days >= 365 ? Math.max(12, months) : months;
  const years = Math.floor(normalizedMonths / 12);

  return {
    days,
    months: normalizedMonths,
    years,
    remainingMonths: normalizedMonths % 12
  };
}

function formatDurationCompact(startInput: string | Date, endInput: string | Date) {
  const duration = getDurationParts(startInput, endInput);

  if (!duration) {
    return null;
  }

  if (duration.days < 1) {
    return "TODAY";
  }

  if (duration.days < 30) {
    return `${duration.days}D`;
  }

  if (duration.months < 12) {
    return `${duration.months}M`;
  }

  return duration.remainingMonths > 0
    ? `${duration.years}Y ${duration.remainingMonths}M`
    : `${duration.years}Y`;
}

function exactDateFromInput(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRemainingClockCompact(startInput: string | Date, endInput: string | Date) {
  const start = exactDateFromInput(startInput);
  const end = exactDateFromInput(endInput);

  if (!start || !end) {
    return null;
  }

  const remainingMs = end.getTime() - start.getTime();

  if (remainingMs < 0) {
    return null;
  }

  if (remainingMs >= 86_400_000) {
    return formatDurationCompact(startInput, endInput);
  }

  const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  return `${hours}H ${minutes}MIN`;
}

function formatDurationLong(startInput: string | Date, endInput: string | Date, label?: string) {
  const duration = getDurationParts(startInput, endInput);

  if (!duration) {
    return null;
  }

  const prefix = label ? `${label} for ` : "";

  if (duration.days < 1) {
    return label ? `${label} today` : "Today";
  }

  if (duration.days < 30) {
    return `${prefix}${duration.days} ${duration.days === 1 ? "day" : "days"}`;
  }

  if (duration.months < 12) {
    return `${prefix}${duration.months} ${duration.months === 1 ? "month" : "months"}`;
  }

  const yearsText = `${duration.years} ${duration.years === 1 ? "year" : "years"}`;
  const monthsText = duration.remainingMonths > 0
    ? ` ${duration.remainingMonths} ${duration.remainingMonths === 1 ? "month" : "months"}`
    : "";

  return `${prefix}${yearsText}${monthsText}`;
}

function placementTransitRange(position: PlanetPosition, generatedAt: string) {
  const speed = averageDailyMotion[position.planet] ?? 1;
  const entryOffset = position.motion === "retrograde"
    ? 30 - position.degree
    : position.degree;
  const exitOffset = position.motion === "retrograde"
    ? position.degree
    : 30 - position.degree;

  return formatTransitRange(
    daysFrom(generatedAt, -(entryOffset / speed)),
    daysFrom(generatedAt, exitOffset / speed)
  );
}

function placementTransitRangeLabel(position: PlanetPosition, generatedAt: string) {
  if (position.transitStart && position.transitEnd) {
    return formatTransitRange(new Date(position.transitStart), new Date(position.transitEnd));
  }

  return placementTransitRange(position, generatedAt);
}

function compactTransitDurationLabel(position: PlanetPosition, generatedAt: string) {
  if (!position.transitEnd) {
    return null;
  }

  return formatRemainingClockCompact(generatedAt, position.transitEnd);
}

function currentSkyAspectTransitWindow(aspect: SkySnapshot["aspects"][number], generatedAt: string) {
  const fastestPlanet = fastestSkyAspectPlanet(aspect);
  const speed = fastestPlanet ? averageDailyMotion[fastestPlanet] ?? 1 : 1;
  const aspectWindowOrb = skyAspectWindowOrb(fastestPlanet);
  const remainingOrb = Math.max(0.2, aspectWindowOrb - aspect.orb);
  const currentOffsetDays = remainingOrb / speed;

  return {
    start: dateFromOffsetDays(generatedAt, -currentOffsetDays),
    end: dateFromOffsetDays(generatedAt, currentOffsetDays)
  };
}

function currentSkyAspectTransitRange(aspect: SkySnapshot["aspects"][number], generatedAt: string) {
  const window = currentSkyAspectTransitWindow(aspect, generatedAt);

  return formatTransitRange(window.start, window.end);
}

function fastestSkyAspectPlanet(aspect: SkySnapshot["aspects"][number]) {
  return [aspect.from, aspect.to]
    .map((planet) => ({ planet, order: placementPlanetOrder.indexOf(planet) }))
    .filter((item) => item.order >= 0)
    .sort((first, second) => first.order - second.order)[0]?.planet ?? null;
}

function skyAspectWindowOrb(fastestPlanet: string | null) {
  if (fastestPlanet === "Moon") {
    return 6;
  }

  return ["Sun", "Mercury", "Venus", "Mars"].includes(fastestPlanet ?? "")
    ? 3
    : 1.5;
}

function skyAspectEstimatedDurationDays(aspect: SkySnapshot["aspects"][number]) {
  const fastestPlanet = fastestSkyAspectPlanet(aspect);
  const speed = fastestPlanet ? averageDailyMotion[fastestPlanet] ?? 1 : 1;

  return (skyAspectWindowOrb(fastestPlanet) * 2) / speed;
}

type AspectTimingDisplay = {
  durationLabel: string;
  rangeLabel: string;
  label: string;
};

function aspectTimingCategoryForWindow(start: Date, end: Date, referenceDate = new Date()) {
  const durationMs = Math.max(0, end.getTime() - start.getTime());
  const durationDays = durationMs / 86_400_000;
  const compactDuration = formatDurationCompact(start, end);

  if (sameLocalDate(start, end)) {
    return sameLocalDate(start, referenceDate) ? "Today" : formatEditorialDate(start);
  }

  if (durationDays <= 3) {
    return "Active for a few days";
  }

  if (durationDays <= 10) {
    return "This week";
  }

  return compactDuration ?? "Ongoing";
}

function aspectRangeLabelForWindow(start: Date, end: Date, referenceDate = new Date()) {
  const durationMs = Math.max(0, end.getTime() - start.getTime());
  const durationDays = durationMs / 86_400_000;

  if (sameLocalDate(start, end)) {
    return `${formatEditorialTime(start)} - ${formatEditorialTime(end)}`;
  }

  if (durationMs < 86_400_000 || durationDays < 365) {
    if (sameLocalDate(start, end)) {
      return formatEditorialDate(start);
    }

    return formatEditorialDateRange(start, end, referenceDate);
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function aspectTimingDisplayForWindow(start: Date, end: Date, referenceDate = new Date()): AspectTimingDisplay {
  const durationLabel = aspectTimingCategoryForWindow(start, end, referenceDate);
  const rangeLabel = aspectRangeLabelForWindow(start, end, referenceDate);

  return {
    durationLabel,
    rangeLabel,
    label: `${durationLabel} · ${rangeLabel}`
  };
}

function skyAspectTimingDisplay(aspect: SkySnapshot["aspects"][number], generatedAt: string) {
  const window = currentSkyAspectTransitWindow(aspect, generatedAt);

  return aspectTimingDisplayForWindow(window.start, window.end, new Date(generatedAt));
}

function detailSectionTitle(index: number) {
  const titles = ["What it means", "How it shows up", "What to do with it", "Keep in mind"];

  return titles[index] ?? "Further notes";
}

function isTimingOnlyArticleSection(section: { heading: string; body: ReactNode }) {
  const bodyText = typeof section.body === "string" ? section.body.trim() : "";

  return /^(pre-shadow|retrograde|post-shadow):/i.test(bodyText);
}

function isSuppressedSkyDetailSectionHeading(heading: string) {
  const normalized = heading.trim().toLowerCase();

  return normalized === "logic" || normalized === "large scale" || normalized === "large-scale";
}

function isRetrogradeTimelineNode(node: ReactNode) {
  if (!isValidElement<{ className?: string }>(node)) {
    return false;
  }

  return typeof node.props.className === "string" && node.props.className.includes("retrograde-detail-line");
}

function SkyDetailArticle({
  detail,
  onClose
}: {
  detail: SkyDetail;
  onClose: () => void;
}) {
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [detail.title, detail.meta]);

  const metaRows = detailMetaRows(detail.meta);
  const statement = detail.content?.knowledge?.interpretation.coreTheme;
  const articleBody = detail.body.filter((node) => !isRetrogradeTimelineNode(node));
  const paragraphs = articleBody;
  const generatedSections = (detail.sections ?? []).filter(
    (section) => !isTimingOnlyArticleSection(section) && !isSuppressedSkyDetailSectionHeading(section.heading)
  ).map((section) => ({
    ...section,
    heading: section.heading.replace(/^\d{1,2}\s*[.\-·:]\s*/u, "").trim()
  }));
  const drilldown = detail.astrologyDrilldown;
  const [lede] = paragraphs;
  const detailSubtitle = detail.subtitle ? stripTldrPrefix(detail.subtitle).trim() : "";
  const articleSub = (detailSubtitle || statement || (typeof lede === "string" ? lede : "")).trim();
  const articleSubCopy = normalizedArticleCopy(articleSub);
  const fallbackParagraphs = paragraphs.filter((paragraph, index) => {
    if (index !== 0 || !articleSubCopy) {
      return true;
    }

    return normalizedArticleCopy(paragraph) !== articleSubCopy;
  });
  const [bodyLede, ...bodySectionParagraphs] = fallbackParagraphs;
  const shareTitle = `${detail.title} · TLDR Astro`;
  const visibleMetaRows = detail.compactHeader
    ? []
    : metaRows.filter((row) => row.label.toLowerCase() !== "signature");
  const shareText = articleSub || detail.title;

  function copyArticleLink() {
    void navigator.clipboard?.writeText(window.location.href);
  }

  function shareArticle() {
    if (navigator.share) {
      void navigator.share({
        title: shareTitle,
        text: shareText,
        url: window.location.href
      });
      return;
    }

    copyArticleLink();
  }

  return (
    <section
      className="article-page sky-detail-page"
      aria-label={`${detail.title} field guide`}
      aria-labelledby="sky-detail-title"
    >
      <button className="sky-detail-back floating-back-button" type="button" aria-label="Close detail" onClick={onClose}>
        <ChevronLeft size={18} aria-hidden="true" />
        <span>Back</span>
      </button>
      <article className="article-shell sky-detail-article">
        <div className="article-card sky-detail-card">
          <header className="article-id sky-detail-id">
            <h1 className="article-title" id="sky-detail-title">{detail.title}</h1>
            {detailSubtitle ? (
              <div className="article-tldr">
                <span className="article-tldr__label">TLDR</span>
                <p className="article-sub article-tldr__copy">{detailSubtitle}</p>
              </div>
            ) : null}
            <div className="article-header-actions">
              <div className="article-byline">
                <span className="by-author">By tldr astro</span>
              </div>
              <div className="article-share" aria-label="Share this article">
                <span className="share-lab">Share:</span>
                <div className="share-btns">
                  <button className="share-btn" type="button" aria-label="Copy article link" onClick={copyArticleLink}>
                    <Link size={18} aria-hidden="true" />
                  </button>
                  <button className="share-btn" type="button" aria-label="Share article" onClick={shareArticle}>
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
            {visibleMetaRows.length > 0 ? (
              <div className="article-meta sky-detail-meta">
                {visibleMetaRows.map((row) => (
                  <p className="m-row" key={`${row.label}-${row.value}`}>
                    <b>{row.label}:</b> {row.value}
                  </p>
                ))}
              </div>
            ) : null}
          </header>

          <hr className="article-rule" />

          <div className="article-body-card sky-detail-body">
            <div className="article-body-inner">
              {detail.lensHint ? (
                <aside className="article-lens-hint" aria-label="Placement lens">
                  {typeof detail.lensHint === "string" ? <p>{detail.lensHint}</p> : detail.lensHint}
                </aside>
              ) : null}
              {detail.plainBody && fallbackParagraphs.length > 0 ? (
                <section className="article-section sky-detail-section sky-detail-plain-section">
                  {fallbackParagraphs.map((paragraph, paragraphIndex) => (
                    <p key={`plain-${paragraphIndex}`}>{paragraph}</p>
                  ))}
                </section>
              ) : generatedSections.length > 0 ? (
                <>
                  {detail.bodyBeforeSections && fallbackParagraphs.length > 0 ? (
                    <section className="article-section sky-detail-section sky-detail-intro-section">
                      {fallbackParagraphs.map((paragraph, paragraphIndex) => (
                        <p key={`intro-${paragraphIndex}`}>{paragraph}</p>
                      ))}
                    </section>
                  ) : null}
                  {generatedSections.map((section, index) => {
                    const bodyParagraphs = typeof section.body === "string"
                      ? section.body.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean)
                      : [];

                    return (
                      <section className="article-section sky-detail-section" key={`${section.heading || "section"}-${index}`}>
                        {section.heading ? <h2>{section.heading}</h2> : null}
                        {bodyParagraphs.length > 0
                          ? bodyParagraphs.map((paragraph, paragraphIndex) => (
                            <p key={`${section.heading || "section"}-${index}-${paragraphIndex}`}>{paragraph}</p>
                          ))
                          : <p>{section.body}</p>}
                      </section>
                    );
                  })}
                </>
              ) : (
                <>
                  {bodyLede ? (
                    <section className="article-section sky-detail-section">
                      <h2>What it means</h2>
                      <p className="sky-detail-lede">{bodyLede}</p>
                    </section>
                  ) : null}
                  {bodySectionParagraphs.map((paragraph, index) => (
                    <section className="article-section sky-detail-section" key={index}>
                      <h2>{detailSectionTitle(index)}</h2>
                      <p>{paragraph}</p>
                    </section>
                  ))}
                </>
              )}
              {drilldown ? (
                <details className="sky-detail-drilldown">
                  <summary>{drilldown.title || "Why this?"}</summary>
                  <div className="sky-detail-drilldown-body">
                    {drilldown.summary ? <p>{drilldown.summary}</p> : null}
                    {drilldown.factors.length > 0 ? (
                      <dl>
                        {drilldown.factors.map((factor) => (
                          <div key={`${factor.label}-${factor.technicalFact}`}>
                            <dt>{factor.label}</dt>
                            <dd>
                              <strong>{factor.technicalFact}</strong>
                              <span>{factor.plainMeaning}</span>
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                    {drilldown.whyThisScene ? <p>{drilldown.whyThisScene}</p> : null}
                    {drilldown.timingNote ? <p>{drilldown.timingNote}</p> : null}
                  </div>
                </details>
              ) : null}
              {detail.relatedAspects?.rows.length ? (
                <section className="article-related-aspects" aria-label={detail.relatedAspects.heading}>
                  <span className="eyebrow section-label article-related-aspects__label">{detail.relatedAspects.heading}</span>
                  <div className="article-related-aspects__list aspect-row-list">
                    {detail.relatedAspects.rows}
                  </div>
                </section>
              ) : null}
              <div className="sky-detail-end" aria-hidden="true">✦</div>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}

const sampleTransits: TransitItem[] = [
  {
    id: "sun-square-mercury",
    term: "short",
    glyph: "□",
    transitPlanet: "Sun",
    aspect: "square",
    natalPoint: "Mercury",
    natalSign: "Pisces",
    orb: "0° 41'",
    direction: "separating",
    arc: [2.4, 1.5, 0.6, 0.1, 1.2, 2.1],
    note: "The day asks for cleaner language. Name the pressure point before you try to solve it."
  },
  {
    id: "mercury-quincunx-uranus",
    term: "short",
    glyph: "⚻",
    transitPlanet: "Mercury",
    aspect: "quincunx",
    natalPoint: "Uranus",
    natalSign: "Scorpio",
    orb: "0° 17'",
    direction: "separating",
    arc: [1.8, 1.1, 0.4, 0.2, 0.9, 1.6],
    note: "Plans may need a small adjustment rather than a dramatic rewrite."
  },
  {
    id: "mars-sextile-mercury",
    term: "short",
    glyph: "✶",
    transitPlanet: "Mars",
    aspect: "sextile",
    natalPoint: "Mercury",
    natalSign: "Pisces",
    orb: "0° 31'",
    direction: "separating",
    arc: [2.1, 1.2, 0.5, 0.2, 0.8, 1.7],
    note: "Action and language can cooperate when the request is specific."
  },
  {
    id: "mercury-opposition-neptune",
    term: "short",
    glyph: "☍",
    transitPlanet: "Mercury",
    aspect: "opposition",
    natalPoint: "Neptune",
    natalSign: "Sagittarius",
    orb: "1° 04'",
    direction: "separating",
    arc: [2.8, 2.0, 1.1, 0.4, 0.9, 1.8],
    note: "Check assumptions. The most poetic interpretation is not always the most useful one."
  },
  {
    id: "mercury-trine-mars",
    term: "short",
    glyph: "△",
    transitPlanet: "Mercury",
    aspect: "trine",
    natalPoint: "Mars",
    natalSign: "Virgo",
    orb: "1° 29'",
    direction: "applying",
    arc: [2.9, 2.1, 1.4, 0.8, 0.3, 0.6],
    note: "Momentum returns through practical words, direct asks, and useful edits."
  },
  {
    id: "jupiter-quincunx-mars",
    term: "long",
    glyph: "⚻",
    transitPlanet: "Jupiter",
    aspect: "quincunx",
    natalPoint: "Mars",
    natalSign: "Virgo",
    orb: "0° 30'",
    direction: "applying",
    arc: [1.7, 1.2, 0.8, 0.4, 0.2, 0.5],
    note: "Growth is available, but it wants a cleaner use of energy."
  },
  {
    id: "saturn-sextile-ascendant",
    term: "long",
    glyph: "✶",
    transitPlanet: "Saturn",
    aspect: "sextile",
    natalPoint: "Ascendant",
    natalSign: "Scorpio",
    orb: "0° 43'",
    direction: "separating",
    arc: [1.2, 0.8, 0.4, 0.1, 0.7, 1.1],
    note: "A more durable self-presentation is forming through limits, pace, and repetition."
  },
  {
    id: "saturn-quincunx-moon",
    term: "long",
    glyph: "⚻",
    transitPlanet: "Saturn",
    aspect: "quincunx",
    natalPoint: "Moon",
    natalSign: "Libra",
    orb: "0° 55'",
    direction: "separating",
    arc: [1.5, 1.0, 0.6, 0.2, 0.4, 0.9],
    note: "Emotional expectations may need more structure before they feel calm."
  },
  {
    id: "uranus-square-sun",
    term: "long",
    glyph: "□",
    transitPlanet: "Uranus",
    aspect: "square",
    natalPoint: "Sun",
    natalSign: "Aquarius",
    orb: "2° 24'",
    direction: "applying",
    arc: [3.0, 2.5, 2.0, 1.5, 1.0, 0.7],
    note: "The identity story is loosening. Give the future a little more room to interrupt."
  },
  {
    id: "pluto-square-chiron",
    term: "long",
    glyph: "□",
    transitPlanet: "Pluto",
    aspect: "square",
    natalPoint: "Chiron",
    natalSign: "Taurus",
    orb: "0° 13'",
    direction: "separating",
    arc: [0.9, 0.5, 0.2, 0.1, 0.6, 1.0],
    note: "A deep repair process is active around agency, grief, and old survival patterns."
  }
];

const transitAspectDefinitions = [
  { type: "conjunction", exact: 0, orb: 4 },
  { type: "sextile", exact: 60, orb: 3 },
  { type: "square", exact: 90, orb: 4 },
  { type: "trine", exact: 120, orb: 4 },
  { type: "opposition", exact: 180, orb: 4 }
] as const;

const longTransitPlanets = new Set(["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "North Node", "True Node"]);
const slowChapterPlanets = new Set(["Saturn", "Uranus", "Neptune", "Pluto"]);
const transitPriorityTargets = new Set(["Sun", "Moon", "Mercury", "Venus", "Mars", "Ascendant", "Midheaven"]);

function formatOrb(orb: number) {
  const degrees = Math.floor(orb);
  const minutes = Math.round((orb - degrees) * 60);

  return `${degrees}° ${String(minutes).padStart(2, "0")}'`;
}

function transitNote(transitPlanet: string, aspect: string, natalPoint: string) {
  const tones: Record<string, string> = {
    conjunction: "starts a direct conversation with",
    sextile: "opens a cooperative path to",
    square: "creates useful friction with",
    trine: "moves smoothly through",
    opposition: "pulls awareness across"
  };

  return `${transitPlanet} ${tones[aspect] ?? "contacts"} your natal ${natalPoint}. Read this as timing: today's sky is activating that part of your chart.`;
}

function natalPointTheme(point: string) {
  const themes: Record<string, string> = {
    Sun: "identity and vitality",
    Moon: "emotional needs and instinct",
    Mercury: "thinking and communication",
    Venus: "love, taste, and connection",
    Mars: "drive, anger, and desire",
    Jupiter: "growth, faith, and opportunity",
    Saturn: "limits, discipline, and responsibility",
    Uranus: "freedom, disruption, and change",
    Neptune: "dreams, sensitivity, and imagination",
    Pluto: "power, depth, and transformation",
    Chiron: "tenderness, repair, and old wounds",
    "North Node": "growth edge and future direction",
    "True Node": "growth edge and future direction",
    "South Node": "familiar patterns and release",
    Ascendant: "presence, body, and first impressions",
    Midheaven: "visibility, work, and direction"
  };

  return themes[point] ?? point.toLowerCase();
}

function aspectRelationshipDescription(firstPoint: string, aspect: string, secondPoint: string) {
  const firstTheme = natalPointTheme(firstPoint);
  const secondTheme = natalPointTheme(secondPoint);
  const aspectCopy: Record<string, string> = {
    conjunction: "These parts of you operate in the same room, intensifying each other and making this pattern hard to ignore.",
    sextile: "These parts of you can cooperate when you choose to use them together.",
    square: "These parts of you create friction, which can become motivation once you stop treating one side as the problem.",
    trine: "These parts of you tend to move together naturally, often becoming a quiet strength.",
    opposition: "These parts of you pull awareness between two poles, asking for balance rather than a winner."
  };

  return `${firstPoint} ${aspect} ${secondPoint} links ${firstTheme} with ${secondTheme}. ${aspectCopy[aspect] ?? "This aspect shows how these two parts of your chart speak to each other."}`;
}

function aspectOtherPoint(aspect: SkySnapshot["aspects"][number], point: string) {
  return aspect.from === point ? aspect.to : aspect.from;
}

function natalAspectDetailArticle(
  aspect: SkySnapshot["aspects"][number],
  generatedContent: GeneratedContentMap = new Map(),
  ownerContext?: { ownerName: string; ownerKind?: "person" | "chart" }
): YouTransitArticle {
  const contentKey = aspectContentId(aspect.from, aspect.type, aspect.to);
  const title = `${aspect.from} ${titleCase(aspect.type)} ${aspect.to}`;
  const content = fallbackFromHook(
    "you.natal-aspect",
    {
      planetA: aspect.from,
      aspect: aspect.type,
      planetB: aspect.to
    },
    approvedVoiceOrKnowledgeFallback(contentKey)
  );
  const generated = liveGeneratedContent(generatedContent, contentKey);
  const body = liveGeneratedBody(
    generated,
    content.detailParagraphs.length > 0
      ? content.detailParagraphs
      : [content.summary || aspectRelationshipDescription(aspect.from, aspect.type, aspect.to)]
  );
  const summary = liveGeneratedSummary(
    generated,
    content.summary || aspectRelationshipDescription(aspect.from, aspect.type, aspect.to)
  );
  const ownerAwareCopy = (value: string) => ownerContext
    ? natalGeneratedCopyForOwner(value, ownerContext.ownerName, ownerContext.ownerKind ?? "person")
    : value;

  return {
    id: contentKey,
    title,
    glyph: pointGlyph(aspect.from),
    subtitle: stripTldrPrefix(ownerAwareCopy(summary)),
    compactHeader: true,
    bodyBeforeSections: true,
    body: body.map(ownerAwareCopy),
    summary: "",
    summaryHeading: "",
    sections: [],
    meta: [
      { label: "Aspect", value: titleCase(aspect.type) },
      { label: "Orb", value: wholeDegreeOrb(aspect.orb) }
    ]
  };
}

function currentSkyAspectDetailArticle(
  aspect: SkySnapshot["aspects"][number],
  generatedAt: string,
  generatedContent: GeneratedContentMap
): SkyDetail {
  const title = `${aspect.from} ${titleCase(aspect.type)} ${aspect.to}`;
  const contentKey = currentSkyAspectContentId(aspect.from, aspect.type, aspect.to);
  const content = fallbackFromHook(
    "sky.aspect-detail",
    {
      planetA: aspect.from,
      aspect: aspect.type,
      planetB: aspect.to
    },
    approvedVoiceOrKnowledgeFallback(contentKey, "sky")
  );
  const generated = liveGeneratedContentByKeys(generatedContent, skyAspectGeneratedContentKeys(aspect, generatedAt));
  const rowSummary = liveGeneratedSummary(generated, content.summary);
  const detailParagraphs = liveGeneratedBody(generated, content.detailParagraphs);

  return {
    glyph: `${pointGlyph(aspect.from)} ${aspectGlyph(aspect.type)} ${pointGlyph(aspect.to)}`,
    kicker: "",
    title: generated?.headline ?? title,
    meta: `${aspectTone(aspect.type).toUpperCase()} · ${currentSkyAspectTransitRange(aspect, generatedAt)}`,
    subtitle: stripTldrPrefix(rowSummary),
    content: content.bundle,
    body: detailParagraphs,
    sections: generatedDetailSections(generated),
    astrologyDrilldown: generatedAstrologyDrilldown(generated)
  };
}

function relatedAspectRowsForPlacement({
  aspects,
  generatedAt,
  generatedContent,
  mode,
  onOpenNatalAspect,
  onOpenSkyAspect,
  ownerContext,
  pointName
}: {
  aspects: SkySnapshot["aspects"];
  generatedAt?: string;
  generatedContent: GeneratedContentMap;
  mode: "sky" | "natal";
  onOpenNatalAspect?: (aspect: SkySnapshot["aspects"][number]) => void;
  onOpenSkyAspect?: (aspect: SkySnapshot["aspects"][number]) => void;
  ownerContext?: { ownerName: string; ownerKind?: "person" | "chart" };
  pointName: string;
}) {
  return aspects
    .filter((aspect) => aspect.from === pointName || aspect.to === pointName)
    .slice()
    .sort((first, second) => first.orb - second.orb)
    .slice(0, mode === "sky" ? 2 : 4)
    .map((aspect) => {
      const otherPoint = aspectOtherPoint(aspect, pointName);
      const title = `${pointName} ${titleCase(aspect.type)} ${otherPoint}`;
      const generated = mode === "sky" && generatedAt
        ? liveGeneratedContentByKeys(generatedContent, skyAspectGeneratedContentKeys(aspect, generatedAt))
        : liveGeneratedContent(generatedContent, aspectContentId(aspect.from, aspect.type, aspect.to));
      const fallback = mode === "sky"
        ? fallbackFromHook(
            "sky.aspect-detail",
            { planetA: aspect.from, aspect: aspect.type, planetB: aspect.to },
            approvedVoiceOrKnowledgeFallback(currentSkyAspectContentId(aspect.from, aspect.type, aspect.to), "sky")
          )
        : fallbackFromHook(
            "you.natal-aspect",
            { planetA: aspect.from, aspect: aspect.type, planetB: aspect.to },
            approvedVoiceOrKnowledgeFallback(aspectContentId(aspect.from, aspect.type, aspect.to))
          );
      const rowSummary = liveGeneratedSummary(
        generated,
        fallback.summary || aspectRelationshipDescription(pointName, aspect.type, otherPoint)
      );
      const displaySummary = ownerContext && mode === "natal"
        ? natalGeneratedCopyForOwner(rowSummary, ownerContext.ownerName, ownerContext.ownerKind ?? "person")
        : rowSummary;
      const rowContent = (
        <>
          <AspectGlyphs from={pointName} aspect={aspect.type} to={otherPoint} />
          <span className="aspect-row-copy">
            <h3>{title}</h3>
            {displaySummary ? <p>{displaySummary}</p> : null}
          </span>
          <span className="aspect-row-meta" aria-label={`${wholeDegreeOrb(aspect.orb)} orb`}>
            <span className="aspect-row-dot" aria-hidden="true" />
            <span>{wholeDegreeOrb(aspect.orb)}</span>
          </span>
        </>
      );

      if (mode === "natal" && onOpenNatalAspect) {
        return (
          <button
            aria-label={`Read more about ${title}`}
            className="article-related-aspect-row aspect-row aspect-row-button"
            key={`${mode}-${pointName}-${aspect.from}-${aspect.type}-${aspect.to}`}
            onClick={() => onOpenNatalAspect(aspect)}
            type="button"
          >
            {rowContent}
          </button>
        );
      }

      if (mode === "sky" && onOpenSkyAspect) {
        return (
          <button
            aria-label={`Read more about ${title}`}
            className="article-related-aspect-row aspect-row aspect-row-button"
            key={`${mode}-${pointName}-${aspect.from}-${aspect.type}-${aspect.to}`}
            onClick={() => onOpenSkyAspect(aspect)}
            type="button"
          >
            {rowContent}
          </button>
        );
      }

      return (
        <div
          className="article-related-aspect-row aspect-row aspect-row-static"
          key={`${mode}-${pointName}-${aspect.from}-${aspect.type}-${aspect.to}`}
        >
          {rowContent}
        </div>
      );
    });
}

function isElevatedSlowTransit(transitPlanet: string, natalPoint: string, orbValue: number) {
  if (!slowChapterPlanets.has(transitPlanet)) {
    return true;
  }

  return orbValue <= 1.5 || transitPriorityTargets.has(natalPoint);
}

function transitAspectOrb(definition: (typeof transitAspectDefinitions)[number], transitPosition: PlanetPosition, natalPosition: PlanetPosition, sunriseOrb: number) {
  const isSunHorizonContact = transitPosition.planet === "Sun"
    && ["Ascendant", "Descendant"].includes(natalPosition.planet)
    && ["conjunction", "opposition"].includes(definition.type);

  return isSunHorizonContact ? definition.orb + sunriseOrb : definition.orb;
}

function buildNatalTransitItems(transitPositions: PlanetPosition[], natalPositions: PlanetPosition[], sunriseOrb = DEFAULT_SUNRISE_ORB_DEGREES): TransitItem[] {
  return transitPositions.flatMap((transitPosition) => (
    natalPositions.flatMap((natalPosition) => {
      const separation = angularDistance(zodiacLongitude(transitPosition), zodiacLongitude(natalPosition));
      const aspect = transitAspectDefinitions
        .map((definition) => ({ ...definition, orbValue: Math.abs(separation - definition.exact) }))
        .filter((definition) => definition.orbValue <= transitAspectOrb(definition, transitPosition, natalPosition, sunriseOrb))
        .sort((first, second) => first.orbValue - second.orbValue)[0];

      if (!aspect) {
        return [];
      }

      const id = `${transitPosition.planet}-${aspect.type}-${natalPosition.planet}`.toLowerCase().replace(/\s+/g, "-");
      const elevatedSlowTransit = isElevatedSlowTransit(transitPosition.planet, natalPosition.planet, aspect.orbValue);

      return {
        id,
        term: longTransitPlanets.has(transitPosition.planet) ? "long" : "short",
        glyph: aspectGlyph(aspect.type),
        transitPlanet: transitPosition.planet,
        transitSign: transitPosition.sign,
        aspect: aspect.type,
        natalPoint: natalPosition.planet,
        natalSign: natalPosition.sign,
        natalHouse: natalPosition.house,
        orb: formatOrb(aspect.orbValue),
        direction: aspect.orbValue <= 1 ? "applying" : "separating",
        arc: [aspect.orbValue + 1.8, aspect.orbValue + 1.1, aspect.orbValue + 0.4, aspect.orbValue, aspect.orbValue + 0.5, aspect.orbValue + 1.2],
        note: transitNote(transitPosition.planet, aspect.type, natalPosition.planet),
        isSlowGeneralWeather: slowChapterPlanets.has(transitPosition.planet) && !elevatedSlowTransit
      } satisfies TransitItem;
    })
  ))
    .sort((first, second) => transitOrbValue(first) - transitOrbValue(second));
}

function transitOrbValue(transit: TransitItem) {
  const [degreePart = "0", minutePart = "0"] = transit.orb.split(" ");
  const degrees = Number.parseFloat(degreePart);
  const minutes = Number.parseFloat(minutePart.replace("'", ""));

  return (Number.isFinite(degrees) ? degrees : 0) + (Number.isFinite(minutes) ? minutes / 60 : 0);
}

function transitItemActiveWindow(transit: TransitItem, generatedAt: string) {
  const definition = transitAspectDefinitions.find((aspect) => aspect.type === transit.aspect);
  const speed = averageDailyMotion[transit.transitPlanet] ?? 1;
  const aspectWindowOrb = definition?.orb ?? (transit.term === "long" ? 1.5 : 3);
  const remainingOrb = Math.max(0.2, aspectWindowOrb - transitOrbValue(transit));
  const currentOffsetDays = remainingOrb / speed;

  return {
    start: dateFromOffsetDays(generatedAt, -currentOffsetDays),
    end: dateFromOffsetDays(generatedAt, currentOffsetDays)
  };
}

function transitItemTimingDisplay(transit: TransitItem, generatedAt: string) {
  const window = transitItemActiveWindow(transit, generatedAt);

  return aspectTimingDisplayForWindow(window.start, window.end, new Date(generatedAt));
}

function completedAgeOnDate(birthDate: string, currentDateValue: string) {
  const [, birthYear = "", birthMonth = "", birthDay = ""] = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];
  const currentDate = new Date(currentDateValue);

  if (!birthYear || Number.isNaN(currentDate.getTime())) {
    return null;
  }

  const year = Number(birthYear);
  const month = Number(birthMonth);
  const day = Number(birthDay);
  let age = currentDate.getUTCFullYear() - year;
  const hasBirthdayPassed = currentDate.getUTCMonth() + 1 > month
    || (currentDate.getUTCMonth() + 1 === month && currentDate.getUTCDate() >= day);

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function signAtWholeSignHouse(ascendant: string, house: number) {
  const ascendantIndex = zodiacSigns.indexOf(ascendant);

  if (ascendantIndex < 0 || house < 1) {
    return "";
  }

  return zodiacSigns[(ascendantIndex + house - 1) % 12] ?? "";
}

function wholeSignHouseForSign(sign: string, ascendant: string) {
  const signIndex = zodiacSigns.indexOf(sign);
  const ascendantIndex = zodiacSigns.indexOf(ascendant);

  if (signIndex < 0 || ascendantIndex < 0) {
    return null;
  }

  return ((signIndex - ascendantIndex + 12) % 12) + 1;
}

function chartRulerForAscendant(ascendant: string) {
  return traditionalSignRulers[ascendant] ?? "";
}

function natalHouseInsightForHouse(house: number, natalSky: SkySnapshot | null): PlacementHouseInsight {
  const houseLabel = `${ordinalHouse(house)} House`;
  const naturalSign = naturalHouseSigns[house] ?? "";
  const naturalLensLabel = naturalSign ? `${naturalSign} lens` : `${houseLabel} lens`;
  const houseBody = naturalHouseLensBodies[house] ?? `The ${houseLabel.toLowerCase()} is ${houseLifeAreas[house] ?? "a specific life area"}.`;
  const naturalLensBody = naturalSign ? naturalSignLensBodies[naturalSign] : "";
  const lensBody = naturalLensBody || houseBody;

  if (!natalSky?.ascendant) {
    return {
      houseLabel,
      naturalLensLabel,
      houseBody,
      lensBody,
      naturalLensBody,
      rulerBody: "Add a birth time to clarify the sign on this house and the ruler that carries this thread through the chart."
    };
  }

  const houseSign = signAtWholeSignHouse(natalSky.ascendant, house);
  const houseRuler = traditionalSignRulers[houseSign] ?? "";
  const rulerPosition = houseRuler
    ? natalSky.positions.find((candidate) => candidate.planet === houseRuler)
    : null;
  const rulerHouseKeywords = rulerPosition?.house
    ? rulerHouseRouteKeywords[rulerPosition.house] ?? houseLifeAreas[rulerPosition.house]
    : null;
  if (!houseSign || !houseRuler) {
    return {
      houseLabel,
      naturalLensLabel,
      houseBody,
      lensBody
    };
  }

  const rulerBody = rulerPosition
    ? `Your ${houseLabel.toLowerCase()} starts in ${houseSign}, so ${houseRuler} runs it. ${houseRuler} sits${rulerPosition.house ? ` in your ${ordinalHouse(rulerPosition.house)} house` : ""} in ${rulerPosition.sign}${rulerHouseKeywords ? `, which routes this placement through ${rulerHouseKeywords}.` : ", which routes this placement through the ruler's own placement."}`
    : `Your ${houseLabel.toLowerCase()} starts in ${houseSign}, so ${houseRuler} runs it. The ruler's placement shows how this placement routes through the chart.`;

  return {
    houseLabel,
    naturalLensLabel,
    houseBody,
    lensBody,
    naturalLensBody,
    rulerBody
  };
}

function natalHouseInsightForPosition(position: PlanetPosition, natalSky: SkySnapshot | null): PlacementHouseInsight | null {
  if (!position.house || position.planet === "Ascendant") {
    return null;
  }

  return natalHouseInsightForHouse(position.house, natalSky);
}

const emptyHouseDescriptions: Record<number, string> = {
  1: "No natal planets here can make identity feel less crowded. The Ascendant and its ruler still describe how this house speaks.",
  2: "Money, resources, and self-worth may not demand constant attention, but the ruler of this house still shows how stability gets built.",
  3: "Communication and daily movement may feel natural or less loaded. Look to the house ruler for the deeper pattern behind your voice.",
  4: "Home and family may not be the loudest chart theme, but roots still matter. The ruler shows how emotional foundation gets handled.",
  5: "Creativity, romance, pleasure, and children can flow without needing to carry the whole chart. The ruler shows where joy gets routed.",
  6: "Routines, work, health, and maintenance may run with less inner friction. The ruler shows how daily life asks to be managed.",
  7: "Relationships are still important, even when this house is empty. The ruler shows what partnership, attraction, and agreement answer to.",
  8: "Intimacy, trust, debt, and shared power may not be constant pressure points. The ruler shows where deeper exchanges get processed.",
  9: "Belief, study, travel, and perspective may feel easier to explore without needing to prove one fixed philosophy.",
  10: "Career and public life may be flexible rather than overdefined. The ruler shows how visibility and responsibility develop over time.",
  11: "Friends, groups, and future hopes may feel accessible without becoming the chart's main demand. The ruler shows where belonging leads.",
  12: "Rest, privacy, dreams, and hidden pressure may move more quietly. The ruler shows how retreat and inner processing work in the chart."
};

function emptyHouseTitle(house: number, natalSky: SkySnapshot | null) {
  const houseSign = natalSky?.ascendant ? signAtWholeSignHouse(natalSky.ascendant, house) : "";

  return houseSign ? `Empty ${ordinalHouse(house)} House in ${houseSign}` : `Empty ${ordinalHouse(house)} House`;
}

function timingContextForChart({
  birthDate,
  currentDate,
  ascendant,
  natalPositions
}: {
  birthDate: string;
  currentDate: string;
  ascendant: string;
  natalPositions: PlanetPosition[];
}): FriendTimingContext {
  const age = completedAgeOnDate(birthDate, currentDate);
  const fallbackHouse = age === null ? null : (age % 12) + 1;
  const fallbackSign = fallbackHouse ? signAtWholeSignHouse(ascendant, fallbackHouse) : "";
  const fallbackLord = traditionalSignRulers[fallbackSign] ?? "";
  const fallbackChartRuler = chartRulerForAscendant(ascendant);

  if (age === null || !ascendant) {
    return {
      age,
      profectedHouse: fallbackHouse,
      profectedSign: fallbackSign,
      lordOfYear: fallbackLord,
      chartRuler: fallbackChartRuler,
      activeNatalPlanetsInProfectedSign: []
    };
  }

  try {
    const timing = buildAnnualTimingContext({
      ageYears: age,
      ascendantSign: ascendant,
      natalPlanets: natalPositions.map((position) => ({
        planet: position.planet,
        sign: position.sign
      }))
    });

    return {
      age: timing.ageYears,
      profectedHouse: timing.profectedHouse,
      profectedSign: titleCase(timing.profectedSign),
      lordOfYear: titleCase(timing.lordOfYear),
      chartRuler: fallbackChartRuler,
      activeNatalPlanetsInProfectedSign: timing.activeNatalPlanetsInProfectedSign
    };
  } catch {
    return {
      age,
      profectedHouse: fallbackHouse,
      profectedSign: fallbackSign,
      lordOfYear: fallbackLord,
      chartRuler: fallbackChartRuler,
      activeNatalPlanetsInProfectedSign: []
    };
  }
}

function friendTimingContext(chart: ManualChart, currentSky: SkySnapshot): FriendTimingContext {
  return timingContextForChart({
    birthDate: chart.birthDate,
    currentDate: currentSky.generatedAt,
    ascendant: chart.natalChart?.ascendant ?? "",
    natalPositions: chart.natalChart?.positions ?? []
  });
}

function titleCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function timingTargetName(point: string) {
  if (point === "Midheaven") {
    return "mc";
  }

  if (point === "North Node" || point === "True Node") {
    return "north_node";
  }

  return point;
}

function normalizedTimingToken(value?: string) {
  const token = value?.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");

  return token || undefined;
}

function rankedTransitItems(transits: TransitItem[], timing: FriendTimingContext) {
  const timingContext = {
    lordOfYear: normalizedTimingToken(timing.lordOfYear) as TraditionalPlanet | undefined,
    chartRuler: normalizedTimingToken(timing.chartRuler),
    profectedHouse: timing.profectedHouse ?? undefined,
    profectedSign: normalizedTimingToken(timing.profectedSign) as ZodiacSign | undefined,
    activeNatalPlanetsInProfectedSign: timing.activeNatalPlanetsInProfectedSign ?? []
  } as Parameters<typeof rankTransits>[1];

  const ranked = rankTransits(
    transits.map((transit, index) => ({
      index,
      transitingPlanet: transit.transitPlanet,
      natalTarget: timingTargetName(transit.natalPoint),
      aspect: transit.aspect,
      orbDegrees: transitOrbValue(transit),
      phase: transit.direction,
      house: transit.natalHouse,
      sign: transit.transitSign,
      touchesAngle: ["Ascendant", "Descendant", "Midheaven", "Imum Coeli"].includes(transit.natalPoint)
        || Boolean(transit.natalHouse && [1, 4, 7, 10].includes(transit.natalHouse))
    })),
    timingContext
  );

  return ranked.map((scored) => {
    const transit = transits[Number(scored.index)] ?? transits[0];
    const isSlowGeneralWeather = transit.isSlowGeneralWeather ?? false;

    return {
      ...transit,
      score: isSlowGeneralWeather ? scored.score - 35 : scored.score,
      significance: isSlowGeneralWeather ? "background" : scored.label,
      timingBonuses: scored.factors.bonuses
    };
  }).sort((first, second) => {
    const firstBackgroundPenalty = first.isSlowGeneralWeather ? 1 : 0;
    const secondBackgroundPenalty = second.isSlowGeneralWeather ? 1 : 0;

    if (firstBackgroundPenalty !== secondBackgroundPenalty) {
      return firstBackgroundPenalty - secondBackgroundPenalty;
    }

    return (second.score ?? 0) - (first.score ?? 0);
  });
}

function natalTransitTargets(natalSky: SkySnapshot) {
  if (typeof natalSky.ascendantLongitude !== "number") {
    return natalSky.positions;
  }

  return [
    ...natalSky.positions,
    positionFromLongitude({
      planet: "Ascendant",
      glyph: pointGlyph("Ascendant"),
      longitude: natalSky.ascendantLongitude,
      theme: "Presence, horizon, and first contact"
    }),
    positionFromLongitude({
      planet: "Descendant",
      glyph: pointGlyph("Descendant"),
      longitude: natalSky.ascendantLongitude + 180,
      theme: "Partnership, encounter, and the setting horizon"
    })
  ];
}

function rankedProfileTransits(currentSky: SkySnapshot, natalSky: SkySnapshot, birthDate: string, sunriseOrb = DEFAULT_SUNRISE_ORB_DEGREES) {
  const natalPositions = natalTransitTargets(natalSky);
  const timing = timingContextForChart({
    birthDate,
    currentDate: currentSky.generatedAt,
    ascendant: natalSky.ascendant,
    natalPositions
  });

  return rankedTransitItems(buildNatalTransitItems(currentSky.positions, natalPositions, sunriseOrb), timing);
}

function rankedFriendTransits(currentSky: SkySnapshot, chart: ManualChart, sunriseOrb = DEFAULT_SUNRISE_ORB_DEGREES) {
  const timing = friendTimingContext(chart, currentSky);
  const natalPositions = chart.natalChart ? natalTransitTargets(chart.natalChart) : [];

  return rankedTransitItems(buildNatalTransitItems(currentSky.positions, natalPositions, sunriseOrb), timing);
}

function transitLifeArea(transit: TransitItem, chart: ManualChart) {
  const natalPoint = chart.natalChart?.positions.find((position) => position.planet === transit.natalPoint);

  return natalPoint?.house ? `${ordinalHouse(natalPoint.house)} house` : "house pending";
}

function transitLifeAreaTheme(transit: TransitItem, chart: ManualChart) {
  const natalPoint = chart.natalChart?.positions.find((position) => position.planet === transit.natalPoint);

  return natalPoint?.house ? houseLifeAreas[natalPoint.house] ?? "life area" : "life area pending";
}

function lifeAreaFocusScore(text: string, focusAreas: LifeAreaFocus[]) {
  if (focusAreas.length === 0) {
    return 0;
  }

  const normalizedText = text.toLowerCase();

  return focusAreas.reduce((score, area) => {
    const keywords = lifeAreaFocusKeywords[area] ?? [];
    const matches = keywords.filter((keyword) => normalizedText.includes(keyword)).length;

    return score + matches;
  }, 0);
}

function transitFocusText(transit: TransitItem) {
  const houseTheme = transit.natalHouse ? houseLifeAreas[transit.natalHouse] ?? "" : "";

  return [
    transit.transitPlanet,
    transit.transitSign,
    transit.aspect,
    transit.natalPoint,
    transit.natalSign,
    transit.note,
    houseTheme
  ].filter(Boolean).join(" ");
}

function transitLifeAreaFocusScore(transit: TransitItem, focusAreas: LifeAreaFocus[]) {
  if (focusAreas.length === 0) {
    return 0;
  }

  return focusAreas.reduce((score, area) => {
    const astrology = lifeAreaFocusAstrology[area];
    const houseScore = transit.natalHouse && astrology.houses.includes(transit.natalHouse) ? 8 : 0;
    const planetScore = [transit.transitPlanet, transit.natalPoint].filter((planet) => astrology.planets.includes(planet)).length * 3;
    const aspectScore = astrology.aspects?.includes(transit.aspect) ? 1 : 0;
    const keywordScore = lifeAreaFocusScore(transitFocusText(transit), [area]);

    return score + houseScore + planetScore + aspectScore + keywordScore;
  }, 0);
}

function rankTransitsByLifeAreaFocus<T extends TransitItem>(transits: T[], focusAreas: LifeAreaFocus[]) {
  if (focusAreas.length === 0) {
    return [...transits].sort((first, second) => {
      const firstBackgroundPenalty = first.isSlowGeneralWeather ? 1 : 0;
      const secondBackgroundPenalty = second.isSlowGeneralWeather ? 1 : 0;

      if (firstBackgroundPenalty !== secondBackgroundPenalty) {
        return firstBackgroundPenalty - secondBackgroundPenalty;
      }

      return (second.score ?? 0) - (first.score ?? 0);
    });
  }

  return [...transits].sort((first, second) => {
    const firstBackgroundPenalty = first.isSlowGeneralWeather ? 1 : 0;
    const secondBackgroundPenalty = second.isSlowGeneralWeather ? 1 : 0;

    if (firstBackgroundPenalty !== secondBackgroundPenalty) {
      return firstBackgroundPenalty - secondBackgroundPenalty;
    }

    const firstScore = transitLifeAreaFocusScore(first, focusAreas);
    const secondScore = transitLifeAreaFocusScore(second, focusAreas);

    if (firstScore !== secondScore) {
      return secondScore - firstScore;
    }

    return (second.score ?? 0) - (first.score ?? 0);
  });
}

function relationshipFocusText(contact: SynastryContact) {
  return [
    contact.friendPoint.name,
    contact.friendPoint.role,
    contact.aspect,
    contact.yourPoint.name,
    contact.yourPoint.role,
    contact.tone,
    contact.summary
  ].join(" ");
}

function rankSynastryContactsByLifeAreaFocus(contacts: SynastryContact[], focusAreas: LifeAreaFocus[]) {
  if (focusAreas.length === 0) {
    return contacts;
  }

  return [...contacts].sort((first, second) => {
    const firstScore = lifeAreaFocusScore(relationshipFocusText(first), focusAreas);
    const secondScore = lifeAreaFocusScore(relationshipFocusText(second), focusAreas);

    if (firstScore !== secondScore) {
      return secondScore - firstScore;
    }

    return second.score - first.score;
  });
}

function rankHouseOverlaysByLifeAreaFocus(overlays: HouseOverlay[], focusAreas: LifeAreaFocus[]) {
  if (focusAreas.length === 0) {
    return overlays;
  }

  return [...overlays].sort((first, second) => {
    const firstHouseScore = focusAreas.some((area) => lifeAreaFocusAstrology[area].houses.includes(first.house)) ? 8 : 0;
    const secondHouseScore = focusAreas.some((area) => lifeAreaFocusAstrology[area].houses.includes(second.house)) ? 8 : 0;
    const firstTextScore = lifeAreaFocusScore(`${first.planet} ${houseLifeAreas[first.house] ?? ""} ${first.summary}`, focusAreas);
    const secondTextScore = lifeAreaFocusScore(`${second.planet} ${houseLifeAreas[second.house] ?? ""} ${second.summary}`, focusAreas);
    const firstScore = firstHouseScore + firstTextScore;
    const secondScore = secondHouseScore + secondTextScore;

    return secondScore - firstScore;
  });
}

function skyPositionLifeAreaFocusScore(position: PlanetPosition, focusAreas: LifeAreaFocus[]) {
  if (focusAreas.length === 0) {
    return 0;
  }

  return focusAreas.reduce((score, area) => {
    const astrology = lifeAreaFocusAstrology[area];
    const houseScore = astrology.houses.includes(position.house) ? 8 : 0;
    const planetScore = astrology.planets.includes(position.planet) ? 3 : 0;
    const keywordScore = lifeAreaFocusScore(`${position.planet} ${position.sign} ${position.theme} ${houseLifeAreas[position.house] ?? ""}`, [area]);

    return score + houseScore + planetScore + keywordScore;
  }, 0);
}

const skyPlacementPlanetOrder = [...placementPlanetOrder, "North Node", "South Node"];

function rankSkyPositionsByLifeAreaFocus(positions: PlanetPosition[], focusAreas: LifeAreaFocus[]) {
  if (focusAreas.length === 0) {
    return positions;
  }

  return [...positions].sort((first, second) => {
    const firstScore = skyPositionLifeAreaFocusScore(first, focusAreas);
    const secondScore = skyPositionLifeAreaFocusScore(second, focusAreas);

    if (firstScore !== secondScore) {
      return secondScore - firstScore;
    }

    return skyPlacementPlanetOrder.indexOf(first.planet) - skyPlacementPlanetOrder.indexOf(second.planet);
  });
}

function rankSkyAspectsByTransitDuration(aspects: SkySnapshot["aspects"]) {
  return [...aspects].sort((first, second) => {
    const durationDiff = skyAspectEstimatedDurationDays(first) - skyAspectEstimatedDurationDays(second);

    if (Math.abs(durationDiff) > 0.001) {
      return durationDiff;
    }

    if (first.orb !== second.orb) {
      return first.orb - second.orb;
    }

    const firstFastestPlanet = fastestSkyAspectPlanet(first);
    const secondFastestPlanet = fastestSkyAspectPlanet(second);

    return placementPlanetOrder.indexOf(firstFastestPlanet ?? "") - placementPlanetOrder.indexOf(secondFastestPlanet ?? "");
  });
}

function skyAspectLifeAreaScore(aspect: SkySnapshot["aspects"][number], positions: PlanetPosition[], area: LifeAreaFocus) {
  const astrology = lifeAreaFocusAstrology[area];
  const firstPosition = positions.find((position) => position.planet === aspect.from);
  const secondPosition = positions.find((position) => position.planet === aspect.to);
  const houseScore = [firstPosition?.house, secondPosition?.house].filter((house) => house && astrology.houses.includes(house)).length * 8;
  const planetScore = [aspect.from, aspect.to].filter((planet) => astrology.planets.includes(planet)).length * 3;
  const aspectScore = astrology.aspects?.includes(aspect.type) ? 1 : 0;
  const keywordScore = lifeAreaFocusScore(`${aspect.from} ${aspect.type} ${aspect.to} ${firstPosition?.theme ?? ""} ${secondPosition?.theme ?? ""}`, [area]);

  return houseScore + planetScore + aspectScore + keywordScore;
}

function skyAspectPrimaryLifeArea(aspect: SkySnapshot["aspects"][number], positions: PlanetPosition[], focusAreas: LifeAreaFocus[]) {
  return focusAreas
    .map((area) => ({ area, score: skyAspectLifeAreaScore(aspect, positions, area) }))
    .filter((item) => item.score > 0)
    .sort((first, second) => second.score - first.score)[0]?.area ?? null;
}

function groupSkyAspectsByLifeArea(aspects: SkySnapshot["aspects"], positions: PlanetPosition[], focusAreas: LifeAreaFocus[]) {
  const orderedAspects = rankSkyAspectsByTransitDuration(aspects);

  if (focusAreas.length === 0) {
    return [{ key: "all", label: "", aspects: orderedAspects }];
  }

  const groups = new Map<string, { key: string; label: string; aspects: SkySnapshot["aspects"] }>();
  const unmatched: SkySnapshot["aspects"] = [];

  orderedAspects.forEach((aspect) => {
    const primaryArea = skyAspectPrimaryLifeArea(aspect, positions, focusAreas);

    if (!primaryArea) {
      unmatched.push(aspect);
      return;
    }

    const group = groups.get(primaryArea) ?? {
      key: primaryArea,
      label: "",
      aspects: []
    };
    group.aspects.push(aspect);
    groups.set(primaryArea, group);
  });

  return [
    ...focusAreas.flatMap((area) => {
      const group = groups.get(area);
      return group ? [group] : [];
    }),
    ...(unmatched.length > 0 ? [{ key: "other", label: "", aspects: unmatched }] : [])
  ];
}

function currentSkyHouseActivations(currentSky: SkySnapshot, chart: ManualChart) {
  const ascendant = chart.natalChart?.ascendant ?? "";

  return currentSky.positions
    .map((position) => ({
      planet: position.planet,
      sign: position.sign,
      house: wholeSignHouseForSign(position.sign, ascendant)
    }))
    .filter((activation): activation is { planet: string; sign: string; house: number } => Boolean(activation.house))
    .sort((first, second) => {
      const firstAngular = [1, 4, 7, 10].includes(first.house) ? 0 : 1;
      const secondAngular = [1, 4, 7, 10].includes(second.house) ? 0 : 1;

      return firstAngular - secondAngular || first.house - second.house;
    });
}

function friendUpdateSummary(chart: ManualChart, transit?: TransitItem, generatedContent?: GeneratedContentMap) {
  if (!transit) {
    return "";
  }

  const area = transitLifeArea(transit, chart);
  const contentKey = transitNatalContentId(transit.transitPlanet, transit.aspect, transit.natalPoint);
  const content = fallbackFromHook(
    "you.transit-to-natal",
    {
      transitPlanet: transit.transitPlanet,
      aspect: transit.aspect,
      natalPoint: transit.natalPoint,
      topic: area
    }
  );
  const generated = generatedContent ? liveGeneratedContent(generatedContent, contentKey) : null;

  return liveGeneratedSummary(generated, content.summary);
}

function relationshipAspectContentKeys(firstPoint: string, aspect: string, secondPoint: string, context?: "synastry" | "composite") {
  const baseKey = aspectContentId(firstPoint, aspect, secondPoint, "relationship");
  const reversedBaseKey = aspectContentId(secondPoint, aspect, firstPoint, "relationship");
  const prefixes = context ? [context, "relationship"] : ["relationship", "synastry", "composite"];
  const keys = new Set<string>();

  [baseKey, reversedBaseKey].forEach((key) => {
    keys.add(key);
    prefixes.forEach((prefix) => keys.add(`${prefix}-${key}`));
  });

  return Array.from(keys);
}

function relationshipPlacementContentKeys(point: string, sign: string, context?: "synastry" | "composite", house?: number | null) {
  const baseKey = placementContentId(point, sign, "relationship");
  const prefixes = context ? [context, "relationship"] : ["relationship", "synastry", "composite"];
  const keys = new Set<string>([baseKey]);

  prefixes.forEach((prefix) => keys.add(`${prefix}-${baseKey}`));

  if (house) {
    const normalizedPoint = normalizeContentIdPart(point);
    const houseKeys = [
      `${normalizedPoint}-house-${house}`,
      `${normalizedPoint}-house${house}`,
      `${normalizedPoint}-in-${house}-house`
    ];

    houseKeys.forEach((key) => {
      keys.add(key);
      prefixes.forEach((prefix) => keys.add(`${prefix}-${key}`));
    });
  }

  return Array.from(keys);
}

function timingSummary(chart: ManualChart, timing: FriendTimingContext) {
  if (!timing.profectedHouse || !timing.profectedSign || !timing.lordOfYear) {
    return `${chart.displayName}'s birth time is needed before the year ruler and house emphasis can be read clearly.`;
  }

  return `${chart.displayName} is in a ${ordinalHouse(timing.profectedHouse)} house year, so ${houseLifeAreas[timing.profectedHouse]} may be taking up more space than usual. ${timing.lordOfYear} is lord of the year, so ${timing.lordOfYear} transits may land more noticeably for them.`;
}

function compatibilityHighlights(profileNatalSky: SkySnapshot | null, chart: ManualChart, generatedContent?: GeneratedContentMap) {
  const friendSky = chart.natalChart;
  const friendBigThree = manualChartBigThree(chart);
  const highlights = [
    {
      title: "Chart signature",
      body: `${chart.displayName}'s chart opens with Sun in ${friendBigThree.sun}, Moon in ${friendBigThree.moon}, and ${friendBigThree.rising} rising. This gives the relationship its first layer: how they move through life, what they need emotionally, and how they tend to meet the world.`
    }
  ];

  if (!profileNatalSky || !friendSky) {
    highlights.push({
      title: "Add both charts",
      body: "Add complete birth details for both people to see where the connection feels natural, where it asks for more care, and what the current timing is bringing up."
    });
    return highlights;
  }

  const synastryHits = profileNatalSky.positions.flatMap((yourPosition) => (
    friendSky.positions.flatMap((theirPosition) => {
      const separation = angularDistance(zodiacLongitude(yourPosition), zodiacLongitude(theirPosition));
      const aspect = transitAspectDefinitions
        .map((definition) => ({ ...definition, orbValue: Math.abs(separation - definition.exact) }))
        .filter((definition) => definition.orbValue <= 5)
        .sort((first, second) => first.orbValue - second.orbValue)[0];

      return aspect ? [{
        yourPosition,
        theirPosition,
        aspect,
        score: synastryContactScore(theirPosition.planet, yourPosition.planet, aspect.type, aspect.orbValue)
      }] : [];
    })
  ))
    .filter((hit) => ["Sun", "Moon", "Venus", "Mars", "Mercury", "Saturn"].includes(hit.yourPosition.planet) && ["Sun", "Moon", "Venus", "Mars", "Mercury", "Saturn"].includes(hit.theirPosition.planet))
    .sort((first, second) => second.score - first.score || first.aspect.orbValue - second.aspect.orbValue);

  const topHit = synastryHits[0];
  if (topHit) {
    const title = relationshipThemeTitle(topHit.theirPosition.planet, topHit.yourPosition.planet, topHit.aspect.type);
    const hookFallback = fallbackFromHook(
      "friends.synastry-contact",
      {
        planetA: topHit.theirPosition.planet,
        aspect: topHit.aspect.type,
        planetB: topHit.yourPosition.planet
      }
    );
    const generated = generatedContent
      ? liveGeneratedContentByKeys(generatedContent, relationshipAspectContentKeys(topHit.theirPosition.planet, topHit.aspect.type, topHit.yourPosition.planet, "synastry"))
      : null;
    highlights.push({
      title,
      body: liveGeneratedSummary(generated, hookFallback.summary)
    });
  }

  const yourElement = profileNatalSky.dominantElement;
  const theirElement = friendSky.dominantElement;
  highlights.push({
    title: yourElement === theirElement ? `${yourElement} emphasis` : `${yourElement} meets ${theirElement}`,
    body: yourElement === theirElement
      ? `Both charts lean ${yourElement.toLowerCase()}. The connection may feel familiar because you process life through a similar element, but that can also reinforce the same blind spots.`
      : `Your chart leans ${yourElement.toLowerCase()}; ${chart.displayName}'s leans ${theirElement.toLowerCase()}. Notice where that difference creates useful contrast instead of treating it as a mismatch.`
  });

  return highlights.slice(0, 3);
}

function comparisonPointRole(point: string) {
  const roles: Record<string, string> = {
    Ascendant: "presence, attraction, and first impression",
    Midheaven: "public direction and life trajectory",
    Sun: "identity, vitality, and what feels central",
    Moon: "emotional needs, instincts, and private reactions",
    Mercury: "communication, interpretation, and daily thinking",
    Venus: "affection, pleasure, values, and how love is offered",
    Mars: "desire, pursuit, conflict, and physical chemistry",
    Jupiter: "trust, encouragement, growth, and shared belief",
    Saturn: "commitment, limits, duty, and the pressure to mature",
    Uranus: "freedom, disruption, and the need for space",
    Neptune: "idealization, longing, imagination, and blurred boundaries",
    Pluto: "intensity, control, vulnerability, and deep change",
    "North Node": "familiarity, direction, and timing",
    "True Node": "familiarity, direction, and timing"
  };

  return roles[point] ?? point.toLowerCase();
}

function houseOverlayPlanetMeaning(planet: string) {
  const meanings: Record<string, string> = {
    Sun: "attention, vitality, recognition, and the feeling of being seen",
    Moon: "emotional needs, instinctive reactions, memory, and private comfort",
    Mercury: "conversation, questions, observation, and the way two people make sense of each other",
    Venus: "warmth, affection, ease, beauty, and the desire to make contact feel pleasant",
    Mars: "desire, urgency, friction, courage, and the places where chemistry becomes harder to ignore",
    Jupiter: "encouragement, trust, growth, humor, and the feeling that more is possible",
    Saturn: "seriousness, responsibility, commitment, limits, and the parts of a bond that ask for maturity"
  };

  return meanings[planet] ?? comparisonPointRole(planet);
}

function houseOverlayHouseMeaning(house: number) {
  const meanings: Record<number, string> = {
    1: "identity, appearance, first impressions, and the way someone moves through the world",
    2: "money, resources, values, self-worth, and what helps someone feel steady",
    3: "communication, siblings, daily movement, learning, and the small exchanges that shape everyday life",
    4: "home, family, roots, memory, and emotional foundation",
    5: "romance, pleasure, creativity, sex, children, and what makes life feel alive",
    6: "workflows, health, service, maintenance, and the habits that hold daily life together",
    7: "partnerships, agreements, attraction, conflict, and direct one-on-one connection",
    8: "shared resources, trust, vulnerability, debt, intimacy, and what is difficult to control",
    9: "beliefs, travel, study, faith, worldview, and the search for meaning",
    10: "career, public life, reputation, authority, and the direction someone is building toward",
    11: "friends, networks, hopes, community, and the future someone wants to belong to",
    12: "privacy, retreat, hidden patterns, grief, dreams, and what is processed behind the scenes"
  };

  return meanings[house] ?? houseLifeAreas[house] ?? "this part of life";
}

function houseOverlayConcreteExamples(house: number) {
  const examples: Record<number, string> = {
    1: "first impressions, attraction, body language, confidence, or the way the two of you naturally take up space together",
    2: "money, gifts, practical support, appetite, comfort, shared values, or the question of what feels worth investing in",
    3: "texts, short trips, sibling stories, everyday conversations, errands, and the small exchanges that build familiarity",
    4: "time at home, conversations about family, shared comfort, old memories, or the feeling of being seen somewhere private",
    5: "flirtation, play, creative projects, dates, humor, sex, or the part of the connection that wants to feel alive",
    6: "daily routines, work habits, health choices, helping each other, and the practical maintenance of the bond",
    7: "naming the relationship, negotiating needs, attraction, conflict, agreements, and the way you meet each other directly",
    8: "trust, jealousy, debt, shared resources, vulnerability, intimacy, and the places where the bond asks for more honesty",
    9: "travel, study, belief, spiritual questions, long-distance plans, or the way one person widens the other's view",
    10: "career, reputation, ambition, public visibility, authority, and the way the relationship is noticed by other people",
    11: "friend groups, networks, community, future plans, shared causes, and the places where belonging matters",
    12: "privacy, rest, dreams, grief, hidden patterns, secrecy, and the feelings that are harder to explain in public"
  };

  return examples[house] ?? houseLifeAreas[house] ?? "the concrete details of this part of life";
}

function synastryPointWeight(point: string) {
  const weights: Record<string, number> = {
    Sun: 18,
    Moon: 22,
    Ascendant: 22,
    Midheaven: 14,
    Venus: 18,
    Mars: 18,
    Saturn: 17,
    Mercury: 13,
    Jupiter: 12,
    Pluto: 11,
    Neptune: 9,
    Uranus: 9,
    "North Node": 20,
    "True Node": 20
  };

  return weights[point] ?? 6;
}

function synastryAspectWeight(aspect: string) {
  const weights: Record<string, number> = {
    conjunction: 26,
    opposition: 18,
    square: 18,
    trine: 14,
    sextile: 10
  };

  return weights[aspect] ?? 6;
}

function synastryOrbWeight(orb: number) {
  if (orb <= 0.5) return 30;
  if (orb <= 1) return 24;
  if (orb <= 2) return 16;
  if (orb <= 3) return 10;
  return 4;
}

function synastryContactScore(friendPoint: string, yourPoint: string, aspect: string, orb: number) {
  const personalPairBonus = ["Sun", "Moon", "Mercury", "Venus", "Mars"].includes(friendPoint)
    && ["Sun", "Moon", "Mercury", "Venus", "Mars", "Ascendant"].includes(yourPoint)
    ? 12
    : 0;
  const saturnBondBonus = [friendPoint, yourPoint].includes("Saturn") ? 5 : 0;
  const angleBonus = [friendPoint, yourPoint].some((point) => ["Ascendant", "Midheaven"].includes(point)) ? 8 : 0;

  return synastryOrbWeight(orb)
    + synastryAspectWeight(aspect)
    + synastryPointWeight(friendPoint)
    + synastryPointWeight(yourPoint)
    + personalPairBonus
    + saturnBondBonus
    + angleBonus;
}

function synastryAspectPhrase(aspect: string) {
  const phrases: Record<string, string> = {
    conjunction: "sits directly on",
    opposition: "stands across from",
    square: "presses against",
    trine: "moves easily with",
    sextile: "has an opening with"
  };

  return phrases[aspect] ?? "contacts";
}

function synastryAspectPlainVerb(aspect: string) {
  const phrases: Record<string, string> = {
    conjunction: "amplifies",
    opposition: "pulls against",
    square: "presses on",
    trine: "supports",
    sextile: "opens up"
  };

  return phrases[aspect] ?? "touches";
}

function synastryAspectMeaning(aspect: string) {
  const meanings: Record<string, string> = {
    conjunction: "This contact is hard to miss because the two parts of the chart keep showing up together.",
    opposition: "This contact can feel magnetic and exposing because each person may carry one side of the pattern.",
    square: "This contact creates friction. It can bring momentum, but it needs honesty before it turns into irritation.",
    trine: "This contact tends to feel natural. It can make the connection easier to trust because less translation is needed.",
    sextile: "This contact gives the relationship an opening. It works best when both people actually use it."
  };

  return meanings[aspect] ?? "This contact is one of the repeating patterns between the two charts.";
}

function synastryContactAdvice(aspect: string) {
  if (["square", "opposition"].includes(aspect)) {
    return "Do not rush to decide who is right. Slow the conversation down and separate the feeling from the assumption.";
  }

  if (["trine", "sextile"].includes(aspect)) {
    return "Use the ease instead of leaving it vague. Say what you appreciate, make the plan, or let the support become visible.";
  }

  return "Give the chemistry time to show its shape before making the whole relationship about this one contact.";
}

function synastryActionLine(aspect: string) {
  if (["square", "opposition"].includes(aspect)) {
    return "Slow the reaction down and name what each person is protecting, wanting, or assuming.";
  }

  if (["trine", "sextile"].includes(aspect)) {
    return "Use the ease on purpose. Say the supportive thing, make the simple plan, or let the trust become an action.";
  }

  return "Give the contact room without letting it take over the whole relationship.";
}

function relationshipThemeTitle(firstPoint: string, secondPoint: string, aspect: string) {
  const pair = [firstPoint, secondPoint].sort().join("-");
  const titles: Record<string, string> = {
    "Moon-Sun": "Feeling Seen",
    "Sun-Venus": "Easy Affection",
    "Mars-Venus": "Chemistry And Timing",
    "Moon-Venus": "Softness And Care",
    "Mars-Moon": "Fast Reactions",
    "Moon-Saturn": "Care With Conditions",
    "Saturn-Venus": "Love Gets Serious",
    "Pluto-Venus": "Intense Attachment",
    "Moon-Pluto": "Deep Emotional Pull",
    "Mercury-Moon": "Reading The Tone",
    "Mercury-Neptune": "Mixed Signals",
    "Mercury-Saturn": "Hard Conversations",
    "Jupiter-Moon": "Big Feelings",
    "Jupiter-Venus": "Generosity And Excess",
    "Sun-Neptune": "Idealization",
    "Mars-Saturn": "Pressure And Restraint",
    "Ascendant-Venus": "Immediate Warmth",
    "Ascendant-Mars": "Instant Charge",
    "Ascendant-Sun": "Strong Recognition",
    "Ascendant-Moon": "Familiar Presence"
  };
  const fallbackTone = ["square", "opposition"].includes(aspect) ? "A Pressure Point" : aspect === "conjunction" ? "A Strong Contact" : "An Easy Opening";

  return titles[pair] ?? fallbackTone;
}

function relationshipAspectTitle(ownerName: string, firstPoint: string, aspect: string, comparisonPossessive: string, secondPoint: string) {
  return `${possessiveLabel(ownerName)} ${firstPoint} ${aspect} ${comparisonPossessive} ${secondPoint}`;
}

function comparisonPointsFromSky(sky: SkySnapshot | null): ComparisonPoint[] {
  if (!sky) {
    return [];
  }

  const points = sky.positions
    .filter((position) => position.planet !== "North Node" && position.planet !== "True Node")
    .map((position) => ({
      name: position.planet,
      glyph: position.glyph,
      longitude: zodiacLongitude(position),
      role: comparisonPointRole(position.planet)
    }));

  if (typeof sky.ascendantLongitude === "number") {
    points.push({
      name: "Ascendant",
      glyph: "Asc",
      longitude: normalizedAngle(sky.ascendantLongitude),
      role: comparisonPointRole("Ascendant")
    });
  }

  if (typeof sky.midheavenLongitude === "number") {
    points.push({
      name: "Midheaven",
      glyph: "MC",
      longitude: normalizedAngle(sky.midheavenLongitude),
      role: comparisonPointRole("Midheaven")
    });
  }

  return points;
}

function synastryTone(aspect: string) {
  if (["square", "opposition"].includes(aspect)) {
    return "Friction";
  }

  if (["trine", "sextile"].includes(aspect)) {
    return "Flow";
  }

  return "Fusion";
}

function possessiveLabel(name: string) {
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

function createNatalGeneratedCopyForOwnerConverter(ownerName: string, ownerKind: "person" | "chart" = "person") {
  const isChart = ownerKind === "chart";
  const firstSubject = isChart ? "This chart" : ownerName;
  const firstPossessive = isChart ? "This chart's" : possessiveLabel(ownerName);
  const pronouns = isChart
    ? { subject: "it", object: "it", possessive: "its", reflexive: "itself" }
    : { subject: "they", object: "them", possessive: "their", reflexive: "themselves" };
  let namedMentionUsed = false;

  const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
  const subject = (capitalized: boolean) => {
    if (!namedMentionUsed) {
      namedMentionUsed = true;
      return firstSubject;
    }

    return capitalized ? capitalize(pronouns.subject) : pronouns.subject;
  };
  const possessive = (capitalized: boolean) => {
    if (!namedMentionUsed) {
      namedMentionUsed = true;
      return firstPossessive;
    }

    return capitalized ? capitalize(pronouns.possessive) : pronouns.possessive;
  };
  const subjectWithBe = (capitalized: boolean) => {
    const value = subject(capitalized);

    return `${value} ${value === firstSubject || isChart ? "is" : "are"}`;
  };
  const subjectWithHave = (capitalized: boolean) => {
    const value = subject(capitalized);

    return `${value} ${value === firstSubject || isChart ? "has" : "have"}`;
  };
  const subjectWithVerb = (capitalized: boolean, baseVerb: string, thirdPersonVerb: string) => {
    const value = subject(capitalized);

    return `${value} ${value === firstSubject || isChart ? thirdPersonVerb : baseVerb}`;
  };
  const subjectWithModal = (capitalized: boolean, modal: string) => `${subject(capitalized)} ${modal}`;

  return (text: string) => text
      .replace(/\bpart of you being activated\b/g, `part of ${pronouns.object} that is being activated`)
      .replace(/\bpart of you\b/g, `part of ${pronouns.object}`)
      .replace(/\bwhat gives your life\b/g, `what gives ${pronouns.possessive} life`)
      .replace(/\byourself\b/g, pronouns.reflexive)
      .replace(/\bYour\b/g, () => possessive(true))
      .replace(/\byour\b/g, () => possessive(false))
      .replace(/\bYou are\b/g, () => subjectWithBe(true))
      .replace(/\byou are\b/g, () => subjectWithBe(false))
      .replace(/\bYou have\b/g, () => subjectWithHave(true))
      .replace(/\byou have\b/g, () => subjectWithHave(false))
      .replace(/\bYou discover\b/g, () => subjectWithVerb(true, "discover", "discovers"))
      .replace(/\byou discover\b/g, () => subjectWithVerb(false, "discover", "discovers"))
      .replace(/\bYou learn\b/g, () => subjectWithVerb(true, "learn", "learns"))
      .replace(/\byou learn\b/g, () => subjectWithVerb(false, "learn", "learns"))
      .replace(/\bYou look\b/g, () => subjectWithVerb(true, "look", "looks"))
      .replace(/\byou look\b/g, () => subjectWithVerb(false, "look", "looks"))
      .replace(/\bYou build\b/g, () => subjectWithVerb(true, "build", "builds"))
      .replace(/\byou build\b/g, () => subjectWithVerb(false, "build", "builds"))
      .replace(/\bYou stop\b/g, () => subjectWithVerb(true, "stop", "stops"))
      .replace(/\byou stop\b/g, () => subjectWithVerb(false, "stop", "stops"))
      .replace(/\bYou give\b/g, () => subjectWithVerb(true, "give", "gives"))
      .replace(/\byou give\b/g, () => subjectWithVerb(false, "give", "gives"))
      .replace(/\bYou let\b/g, () => subjectWithVerb(true, "let", "lets"))
      .replace(/\byou let\b/g, () => subjectWithVerb(false, "let", "lets"))
      .replace(/\bYou need\b/g, () => subjectWithVerb(true, "need", "needs"))
      .replace(/\byou need\b/g, () => subjectWithVerb(false, "need", "needs"))
      .replace(/\bYou tend\b/g, () => subjectWithVerb(true, "tend", "tends"))
      .replace(/\byou tend\b/g, () => subjectWithVerb(false, "tend", "tends"))
      .replace(/\bYou feel\b/g, () => subjectWithVerb(true, "feel", "feels"))
      .replace(/\byou feel\b/g, () => subjectWithVerb(false, "feel", "feels"))
      .replace(/\bYou want\b/g, () => subjectWithVerb(true, "want", "wants"))
      .replace(/\byou want\b/g, () => subjectWithVerb(false, "want", "wants"))
      .replace(/\bYou move\b/g, () => subjectWithVerb(true, "move", "moves"))
      .replace(/\byou move\b/g, () => subjectWithVerb(false, "move", "moves"))
      .replace(/\bYou live\b/g, () => subjectWithVerb(true, "live", "lives"))
      .replace(/\byou live\b/g, () => subjectWithVerb(false, "live", "lives"))
      .replace(/\bYou respond\b/g, () => subjectWithVerb(true, "respond", "responds"))
      .replace(/\byou respond\b/g, () => subjectWithVerb(false, "respond", "responds"))
      .replace(/\bYou can\b/g, () => subjectWithModal(true, "can"))
      .replace(/\byou can\b/g, () => subjectWithModal(false, "can"))
      .replace(/\bYou will\b/g, () => subjectWithModal(true, "will"))
      .replace(/\byou will\b/g, () => subjectWithModal(false, "will"))
      .replace(/\bYou may\b/g, () => subjectWithModal(true, "may"))
      .replace(/\byou may\b/g, () => subjectWithModal(false, "may"))
      .replace(/\bYou\b/g, () => subject(true))
      .replace(/\byou\b/g, () => subject(false));
}

function natalGeneratedCopyForOwner(text: string, ownerName: string, ownerKind: "person" | "chart" = "person") {
  return createNatalGeneratedCopyForOwnerConverter(ownerName, ownerKind)(text);
}

function relationshipPairLabel(primaryName: string, comparisonName: string, comparisonIsSelf: boolean) {
  return comparisonIsSelf ? `${primaryName} and you` : `${primaryName} and ${comparisonName}`;
}

function relationshipComparisonPossessive(comparisonName: string, comparisonIsSelf: boolean) {
  return comparisonIsSelf ? "your" : possessiveLabel(comparisonName);
}

function relationshipGeneratedCopyForPerspective(text: string, primaryName: string, comparisonName: string, comparisonIsSelf: boolean) {
  if (comparisonIsSelf) {
    return text;
  }

  const pair = relationshipPairLabel(primaryName, comparisonName, comparisonIsSelf);
  const possessivePrimary = possessiveLabel(primaryName);
  const possessiveComparison = possessiveLabel(comparisonName);

  return text
    .replace(/\bYou both\b/g, pair)
    .replace(/\byou both\b/g, pair)
    .replace(/\bYour charts\b/g, `${possessivePrimary} and ${possessiveComparison} charts`)
    .replace(/\byour charts\b/g, `${possessivePrimary} and ${possessiveComparison} charts`)
    .replace(/\bYour chart\b/g, `${possessiveComparison} chart`)
    .replace(/\byour chart\b/g, `${possessiveComparison} chart`)
    .replace(/\bYour drives\b/g, "The shared drives")
    .replace(/\byour drives\b/g, "the shared drives")
    .replace(/\bYour\b/g, possessiveComparison)
    .replace(/\byour\b/g, possessiveComparison)
    .replace(/\bYou\b/g, pair)
    .replace(/\byou\b/g, pair);
}

function synastryContactSummary(
  friendName: string,
  comparisonName: string,
  comparisonIsSelf: boolean,
  contact: Omit<SynastryContact, "summary">,
  generatedContent?: GeneratedContentMap
) {
  const generated = generatedContent ? liveGeneratedContentByKeys(generatedContent, contact.contentKeys) : null;
  const generatedPreview = generated?.summary?.trim() || generatedContentParagraphs(generated)[0] || null;

  return relationshipGeneratedCopyForPerspective(
    textPreview(generatedPreview || ""),
    friendName,
    comparisonName,
    comparisonIsSelf
  );
}

function synastryContacts(
  profileNatalSky: SkySnapshot | null,
  chart: ManualChart,
  generatedContent?: GeneratedContentMap,
  comparisonName = "You",
  comparisonIsSelf = true
): SynastryContact[] {
  const friendPoints = comparisonPointsFromSky(chart.natalChart ?? null);
  const yourPoints = comparisonPointsFromSky(profileNatalSky);

  return friendPoints
    .flatMap((friendPoint) => yourPoints.flatMap((yourPoint) => {
      const separation = angularDistance(friendPoint.longitude, yourPoint.longitude);
      const aspect = transitAspectDefinitions
        .map((definition) => ({ ...definition, orbValue: Math.abs(separation - definition.exact) }))
        .filter((definition) => definition.orbValue <= Math.max(definition.orb, 5))
        .sort((first, second) => first.orbValue - second.orbValue)[0];

      if (!aspect) {
        return [];
      }

      const baseContact = {
        id: `${chart.id}-${friendPoint.name}-${aspect.type}-${yourPoint.name}`.toLowerCase().replace(/\s+/g, "-"),
        friendPoint,
        yourPoint,
        aspect: aspect.type,
        orb: aspect.orbValue,
        score: synastryContactScore(friendPoint.name, yourPoint.name, aspect.type, aspect.orbValue),
        tone: synastryTone(aspect.type),
        contentKeys: relationshipAspectContentKeys(friendPoint.name, aspect.type, yourPoint.name, "synastry")
      };

      return [{
        ...baseContact,
        summary: synastryContactSummary(chart.displayName, comparisonName, comparisonIsSelf, baseContact, generatedContent)
      }];
    }))
    .sort((first, second) => second.score - first.score || first.orb - second.orb)
    .slice(0, 16);
}

function synastryDetailCopy(friendName: string, comparisonName: string, comparisonIsSelf: boolean, contact: SynastryContact, generatedContent?: GeneratedContentMap) {
  const generated = generatedContent ? liveGeneratedContentByKeys(generatedContent, contact.contentKeys) : null;
  const generatedParagraphs = generatedContentParagraphs(generated);

  if (generatedParagraphs.length > 0) {
    return generatedParagraphs.map((paragraph) => relationshipGeneratedCopyForPerspective(paragraph, friendName, comparisonName, comparisonIsSelf));
  }

  return liveGeneratedBody(generated, []).map((paragraph) => (
    relationshipGeneratedCopyForPerspective(paragraph, friendName, comparisonName, comparisonIsSelf)
  ));
}

function synastryHouseOverlays(profileNatalSky: SkySnapshot | null, chart: ManualChart, generatedContent?: GeneratedContentMap): HouseOverlay[] {
  const friendSky = chart.natalChart;

  if (!profileNatalSky || !friendSky) {
    return [];
  }

  const priorityPlanets = ["Sun", "Moon", "Venus", "Mars", "Mercury", "Jupiter", "Saturn"];
  const overlayRows = [
    ...friendSky.positions.map((position) => ({
      position,
      ownerName: chart.displayName,
      targetName: "your",
      targetAscendant: profileNatalSky.ascendant
    })),
    ...profileNatalSky.positions.map((position) => ({
      position,
      ownerName: "Your",
      targetName: `${chart.displayName}'s`,
      targetAscendant: friendSky.ascendant
    }))
  ];

  return overlayRows
    .filter(({ position }) => priorityPlanets.includes(position.planet))
    .flatMap(({ position, ownerName, targetName, targetAscendant }) => {
      const house = wholeSignHouseForSign(position.sign, targetAscendant);

      if (!house) {
        return [];
      }

      const ownerLabel = ownerName === "Your" ? "Your" : `${ownerName}'s`;
      const houseOwner = targetName === "your" ? "your" : targetName;
      const lifeArea = houseLifeAreas[house] ?? "life area";
      const direction = targetName === "your"
        ? `${ownerLabel} ${position.planet} lands in your ${ordinalHouse(house)} house of ${lifeArea}.`
        : `${ownerLabel} ${position.planet} lands in ${houseOwner} ${ordinalHouse(house)} house of ${lifeArea}.`;
      const contentKeys = [
        ...knowledgeIdsForFallbackHook("friends.house-overlay", {
          planet: position.planet,
          house
        }),
        `synastry-${normalizeContentIdPart(position.planet)}-in-${house}-house`,
        `relationship-${normalizeContentIdPart(position.planet)}-in-${house}-house`,
        ...relationshipPlacementContentKeys(position.planet, position.sign, "synastry")
      ];
      const generated = generatedContent ? liveGeneratedContentByKeys(generatedContent, contentKeys) : null;
      const generatedParagraphs = generatedContentParagraphs(generated);
      const hookFallback = fallbackFromHook(
        "friends.house-overlay",
        {
          planet: position.planet,
          house
        }
      );
      const detailParagraphs = generatedParagraphs.length > 0
        ? generatedParagraphs
        : hookFallback.detailParagraphs.length > 0
          ? hookFallback.detailParagraphs
          : [];

      return [{
        id: `${ownerName}-${position.planet}-${targetName}-${house}`.toLowerCase().replace(/\s+/g, "-"),
        planet: position.planet,
        glyph: position.glyph,
        ownerName,
        targetName,
        house,
        summary: liveGeneratedSummary(generated, hookFallback.summary),
        detailParagraphs,
        contentKeys
      }];
    })
    .sort((first, second) => {
      const firstPriority = priorityPlanets.indexOf(first.planet);
      const secondPriority = priorityPlanets.indexOf(second.planet);
      const firstAngular = [1, 4, 7, 10].includes(first.house) ? 0 : 1;
      const secondAngular = [1, 4, 7, 10].includes(second.house) ? 0 : 1;

      return firstAngular - secondAngular || firstPriority - secondPriority || first.house - second.house;
    })
    .slice(0, 6);
}

function oppositeZodiacSign(sign?: string) {
  if (!sign) {
    return null;
  }

  const signIndex = zodiacSigns.indexOf(sign);

  if (signIndex < 0) {
    return null;
  }

  return zodiacSigns[(signIndex + 6) % 12];
}

function skyPointSign(sky: SkySnapshot | null | undefined, point: string) {
  if (!sky) {
    return null;
  }

  if (point === "Ascendant") {
    return sky.ascendant;
  }

  if (point === "Descendant") {
    return oppositeZodiacSign(sky.ascendant);
  }

  if (point === "Midheaven") {
    return sky.midheaven;
  }

  if (point === "Imum Coeli") {
    return oppositeZodiacSign(sky.midheaven);
  }

  return sky.positions.find((position) => position.planet === point)?.sign ?? null;
}

function relationshipSignRows(profileNatalSky: SkySnapshot | null, chart: ManualChart) {
  const friendSky = chart.natalChart;
  const points = ["Moon", "Venus", "Mars", "Ascendant", "Descendant", "Midheaven", "Imum Coeli", "Jupiter"];

  return points.map((point) => ({
    id: point.toLowerCase().replace(/\s+/g, "-"),
    point,
    glyph: pointGlyph(point),
    yourSign: skyPointSign(profileNatalSky, point),
    friendSign: skyPointSign(friendSky, point)
  }));
}

function relationshipTypeLabel(value?: string) {
  return relationshipTypeLabels[value ?? "friend"] ?? value ?? "Friendship";
}

function relationshipMidpointLongitude(first: number, second: number) {
  const distance = normalizedAngle(second - first);
  const shortestDistance = distance > 180 ? distance - 360 : distance;

  return normalizedAngle(first + shortestDistance / 2);
}

function relationshipCompositeSky(profileNatalSky: SkySnapshot | null, chart: ManualChart): SkySnapshot | null {
  const friendSky = chart.natalChart;

  if (!profileNatalSky || !friendSky) {
    return null;
  }

  const compositeAscendantLongitude = typeof profileNatalSky.ascendantLongitude === "number" && typeof friendSky.ascendantLongitude === "number"
    ? relationshipMidpointLongitude(profileNatalSky.ascendantLongitude, friendSky.ascendantLongitude)
    : undefined;
  const compositeMidheavenLongitude = typeof profileNatalSky.midheavenLongitude === "number" && typeof friendSky.midheavenLongitude === "number"
    ? relationshipMidpointLongitude(profileNatalSky.midheavenLongitude, friendSky.midheavenLongitude)
    : undefined;
  const compositeAscendant = typeof compositeAscendantLongitude === "number"
    ? zodiacSignForLongitude(compositeAscendantLongitude)
    : friendSky.ascendant;
  const compositeMidheaven = typeof compositeMidheavenLongitude === "number"
    ? zodiacSignForLongitude(compositeMidheavenLongitude)
    : friendSky.midheaven;
  const friendPositions = new Map(friendSky.positions.map((position) => [position.planet, position]));
  const positions = profileNatalSky.positions.flatMap((yourPosition) => {
    const friendPosition = friendPositions.get(yourPosition.planet);

    if (!friendPosition || yourPosition.planet === "North Node" || yourPosition.planet === "True Node") {
      return [];
    }

    const longitude = relationshipMidpointLongitude(zodiacLongitude(yourPosition), zodiacLongitude(friendPosition));
    const sign = zodiacSignForLongitude(longitude);

    return [{
      planet: yourPosition.planet,
      glyph: yourPosition.glyph,
      sign,
      signGlyph: zodiacSignGlyphs[sign] ?? "",
      degree: normalizedAngle(longitude) % 30,
      house: wholeSignHouseForSign(sign, compositeAscendant) ?? 0,
      motion: "direct" as const,
      theme: `Shared ${comparisonPointRole(yourPosition.planet)}`
    }];
  });

  const aspects = positions.flatMap((fromPosition, fromIndex) => (
    positions.slice(fromIndex + 1).flatMap((toPosition) => {
      const separation = angularDistance(zodiacLongitude(fromPosition), zodiacLongitude(toPosition));
      const aspect = transitAspectDefinitions
        .map((definition) => ({ ...definition, orbValue: Math.abs(separation - definition.exact) }))
        .filter((definition) => definition.orbValue <= definition.orb)
        .sort((first, second) => first.orbValue - second.orbValue)[0];

      return aspect
        ? [{
            from: fromPosition.planet,
            to: toPosition.planet,
            type: aspect.type,
            orb: aspect.orbValue,
            meaning: `${fromPosition.planet} ${aspect.type} ${toPosition.planet}`
          }]
        : [];
    })
  ))
    .sort((first, second) => first.orb - second.orb)
    .slice(0, 12);

  return {
    location: profileNatalSky.location,
    generatedAt: profileNatalSky.generatedAt,
    ascendant: compositeAscendant,
    ascendantLongitude: compositeAscendantLongitude,
    midheaven: compositeMidheaven,
    midheavenLongitude: compositeMidheavenLongitude,
    moonPhase: "Relationship chart",
    dominantElement: natalElementBalance(positions).sort((first, second) => second.count - first.count)[0]?.element ?? "Fire",
    positions,
    aspects
  };
}

function compositeAspectSummary(
  aspect: { from: string; to: string; type: string; orb: number } | null,
  chartName: string,
  comparisonName: string,
  comparisonIsSelf: boolean,
  generatedContent?: GeneratedContentMap
) {
  if (!aspect) {
    return "No single aspect is dominating the relationship chart. The placements matter more here: they show the bond's tone, needs, and recurring sensitivities.";
  }

  const generated = generatedContent
    ? liveGeneratedContentByKeys(generatedContent, relationshipAspectContentKeys(aspect.from, aspect.type, aspect.to, "composite"))
    : null;

  if (generated) {
    return relationshipGeneratedCopyForPerspective(liveGeneratedSummary(generated, null), chartName, comparisonName, comparisonIsSelf);
  }

  const hookFallback = fallbackFromHook(
    "friends.composite-aspect",
    {
      planetA: aspect.from,
      aspect: aspect.type,
      planetB: aspect.to
    }
  );

  return relationshipGeneratedCopyForPerspective(liveGeneratedSummary(generated, hookFallback.summary), chartName, comparisonName, comparisonIsSelf);
}

function relationshipTiming(profileTransits: TransitItem[], friendTransits: TransitItem[], chart: ManualChart) {
  const sharedPlanets = profileTransits.flatMap((yourTransit) => (
    friendTransits
      .filter((friendTransit) => friendTransit.transitPlanet === yourTransit.transitPlanet)
      .map((friendTransit) => ({ yourTransit, friendTransit }))
  ));

  if (sharedPlanets.length > 0) {
    return sharedPlanets.slice(0, 3).map(({ yourTransit, friendTransit }) => ({
      title: `Both charts are feeling ${yourTransit.transitPlanet}`,
      body: fallbackFromHook(
        "friends.relationship-timing",
        {
          transitPlanet: yourTransit.transitPlanet,
          aspect: yourTransit.aspect,
          natalPoint: yourTransit.natalPoint
        }
      ).summary ?? ""
    }));
  }

  return friendTransits.slice(0, 2).map((transit) => ({
    title: `${chart.displayName} may be feeling ${transit.transitPlanet}`,
    body: fallbackFromHook(
      "friends.relationship-timing",
      {
        transitPlanet: transit.transitPlanet,
        aspect: transit.aspect,
        natalPoint: transit.natalPoint
      }
    ).summary ?? ""
  }));
}

function circleActivationCards(currentSky: SkySnapshot, charts: ManualChart[], focusAreas: LifeAreaFocus[] = [], sunriseOrb = DEFAULT_SUNRISE_ORB_DEGREES) {
  const rows = charts
    .filter((chart) => chart.chartType !== "event" && chart.natalChart)
    .map((chart) => ({
      chart,
      transits: rankTransitsByLifeAreaFocus(rankedFriendTransits(currentSky, chart, sunriseOrb), focusAreas).slice(0, 5),
      timing: friendTimingContext(chart, currentSky)
    }));
  const byPlanet = new Map<string, ManualChart[]>();
  const byHouse = new Map<number, ManualChart[]>();
  const byProfectedHouse = new Map<number, ManualChart[]>();
  const byLordOfYear = new Map<string, ManualChart[]>();

  rows.forEach(({ chart, transits, timing }) => {
    if (timing.profectedHouse) {
      byProfectedHouse.set(timing.profectedHouse, [...(byProfectedHouse.get(timing.profectedHouse) ?? []), chart]);
    }

    if (timing.lordOfYear) {
      byLordOfYear.set(timing.lordOfYear, [...(byLordOfYear.get(timing.lordOfYear) ?? []), chart]);
    }

    transits.forEach((transit) => {
      if (!transit.isSlowGeneralWeather) {
        byPlanet.set(transit.transitPlanet, [...(byPlanet.get(transit.transitPlanet) ?? []), chart]);
      }
      const natalPoint = chart.natalChart?.positions.find((position) => position.planet === transit.natalPoint);

      if (natalPoint?.house) {
        byHouse.set(natalPoint.house, [...(byHouse.get(natalPoint.house) ?? []), chart]);
      }
    });
  });

  const planetCards = Array.from(byPlanet.entries())
    .filter(([, activeCharts]) => new Set(activeCharts.map((chart) => chart.id)).size >= 2)
    .map(([planet, activeCharts]) => {
      const uniqueCharts = Array.from(new Map(activeCharts.map((chart) => [chart.id, chart])).values());

      return {
        title: `${planet} is showing up for more than one person`,
        body: `${readableNameList(uniqueCharts.slice(0, 3).map((chart) => chart.displayName))} are all being touched by ${planet} right now. Conversations may keep circling back to ${comparisonPointRole(planet)}, even if each person is dealing with it in a different part of life.`
      };
    });
  const houseCards = Array.from(byHouse.entries())
    .filter(([, activeCharts]) => new Set(activeCharts.map((chart) => chart.id)).size >= 2)
    .map(([house, activeCharts]) => {
      const uniqueCharts = Array.from(new Map(activeCharts.map((chart) => [chart.id, chart])).values());

      return {
        title: `${houseLifeAreas[house]} are a shared theme`,
        body: `${readableNameList(uniqueCharts.slice(0, 3).map((chart) => chart.displayName))} are all being pulled toward ${ordinalHouse(house)} house topics. The details may be different, but ${houseLifeAreas[house]} are asking for attention across the circle.`
      };
    });
  const profectionCards = Array.from(byProfectedHouse.entries())
    .filter(([, activeCharts]) => activeCharts.length >= 2)
    .map(([house, activeCharts]) => ({
      title: `${houseLifeAreas[house]} are repeating`,
      body: `${readableNameList(activeCharts.slice(0, 3).map((chart) => chart.displayName))} are in ${ordinalHouse(house)} house years. That means ${houseLifeAreas[house]} may be the background topic for more than one person right now.`
    }));
  const lordCards = Array.from(byLordOfYear.entries())
    .filter(([, activeCharts]) => activeCharts.length >= 2)
    .map(([planet, activeCharts]) => ({
      title: `${planet} is setting the year-long tone`,
      body: `${readableNameList(activeCharts.slice(0, 3).map((chart) => chart.displayName))} have ${planet} as lord of the year. ${planet} themes may feel louder for them, especially when the current sky touches that planet.`
    }));

  return [...profectionCards, ...lordCards, ...planetCards, ...houseCards].slice(0, 3);
}

function circleFeedPreviewCards(currentSky: SkySnapshot, charts: ManualChart[], generatedContent?: GeneratedContentMap, focusAreas: LifeAreaFocus[] = [], sunriseOrb = DEFAULT_SUNRISE_ORB_DEGREES) {
  const personCharts = charts.filter((chart) => chart.chartType !== "event");
  const calculatedCharts = personCharts.filter((chart) => chart.natalChart);
  const circleCards = circleActivationCards(currentSky, personCharts, focusAreas, sunriseOrb);

  if (circleCards.length > 0) {
    return circleCards.map((card) => ({
      ...card,
      label: "Circle pattern"
    }));
  }

  if (calculatedCharts.length === 1) {
    const chart = calculatedCharts[0];
    const topTransit = rankTransitsByLifeAreaFocus(rankedFriendTransits(currentSky, chart, sunriseOrb), focusAreas)[0];
    const timing = friendTimingContext(chart, currentSky);

    return [
      {
        label: "Friend update",
        title: topTransit ? `${chart.displayName}: ${topTransit.transitPlanet} ${topTransit.aspect} ${topTransit.natalPoint}` : `${chart.displayName}'s update is ready`,
        body: topTransit ? friendUpdateSummary(chart, topTransit, generatedContent) : timingSummary(chart, timing)
      },
      {
        label: "Comparison chart",
        title: `${chart.displayName} and you`,
        body: "Start with the strongest contacts between your charts, then look at where each person's planets land. That shows what feels easy, what gets stirred up, and where the relationship needs more care."
      },
      {
      label: "Relationship timing",
        title: "What each person is carrying",
        body: "Look at what today's sky is touching in each chart. That can make it easier to tell the difference between relationship tension and personal timing."
      }
    ];
  }

  return [
    {
      label: "Friend updates",
      title: "Current astrology for each person",
      body: "Add a chart to see what the current sky is bringing up in that person's chart."
    },
    {
      label: "Circle patterns",
      title: "Who is feeling something similar",
      body: "With two or more friends, this shows where similar topics are moving through different people at the same time."
    },
    {
      label: "Between Us",
      title: "Relationship timing",
      body: "Select a friend to compare what the current sky is doing to you, to them, and to the relationship pattern."
    }
  ];
}

function isAdminContentPath() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.location.pathname === "/admin/content" || window.location.pathname === "/admin/generated-content";
}

const GeneratedContentAdminDashboard = lazy(() =>
  import("./admin/GeneratedContentAdminDashboard").then((module) => ({
    default: module.GeneratedContentAdminDashboard
  }))
);

const YouPage = lazy(() =>
  import("./features/you/YouPage").then((module) => ({
    default: module.YouPage
  }))
);

const FriendCircleFeed = lazy(() =>
  import("./features/friends/FriendCircleFeed").then((module) => ({
    default: module.FriendCircleFeed
  }))
);

const FriendChartsList = lazy(() =>
  import("./features/friends/FriendChartsList").then((module) => ({
    default: module.FriendChartsList
  }))
);

const FriendChartModal = lazy(() =>
  import("./features/friends/FriendChartModal").then((module) => ({
    default: module.FriendChartModal
  }))
);

const FriendDetail = lazy(() =>
  import("./features/friends/FriendDetail").then((module) => ({
    default: module.FriendDetail
  }))
);

const RelationshipChartFullscreen = lazy(() =>
  import("./features/friends/RelationshipChartFullscreen").then((module) => ({
    default: module.RelationshipChartFullscreen
  }))
);

const RelationshipComparePicker = lazy(() =>
  import("./features/friends/RelationshipComparePicker").then((module) => ({
    default: module.RelationshipComparePicker
  }))
);

function FeatureLoadingFallback() {
  return <div className="feature-loading-fallback" aria-hidden="true" />;
}

export function App() {
  if (isAdminContentPath()) {
    return (
      <Suspense fallback={<main style={{ minHeight: "100vh", padding: 28 }}>Loading admin dashboard...</main>}>
        <GeneratedContentAdminDashboard />
      </Suspense>
    );
  }

  const initialLocationState = useMemo(getInitialLocation, []);
  const restoredPortalModeRef = useRef<PortalMode | null>(getStoredPortalMode());
  const [theme, setTheme] = useState<UiTheme>(getInitialTheme);
  const [sunriseOrbEnabled, setSunriseOrbEnabled] = useState(getInitialSunriseOrb);
  const [dyslexiaFriendlyFont, setDyslexiaFriendlyFont] = useState(getInitialDyslexiaFont);
  const [guestHouseSignLabelStyle, setGuestHouseSignLabelStyle] = useState<HouseSignLabelStyle>(getInitialHouseSignLabelStyle);
  const [skyDate, setSkyDate] = useState(dateInputValue);
  const [mode, setMode] = useState<PortalMode>(getInitialPortalMode);
  const [location, setLocation] = useState<LocationInput>(initialLocationState.location);
  const [manualLocation, setManualLocation] = useState(initialLocationState.location.label);
  const [hasLocationPreference, setHasLocationPreference] = useState(initialLocationState.hasSavedLocation);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [mobileSkyControlsOpen, setMobileSkyControlsOpen] = useState(false);
  const [skyFullChartOpen, setSkyFullChartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [friendsLandingKey, setFriendsLandingKey] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mobileSkyControlsRef = useRef<HTMLDivElement | null>(null);
  const datePickerRef = useRef<HTMLElement | null>(null);
  const datePickerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mobileDatePickerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const cityPickerRef = useRef<HTMLFormElement | null>(null);
  const cityPickerInputRef = useRef<HTMLInputElement | null>(null);
  const cityPickerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [citySearchStatus, setCitySearchStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [transitForm, setTransitForm] = useState<TransitForm>(createBlankTransitForm);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(getInitialUserProfile);
  const [remoteAccountId, setRemoteAccountId] = useState<string | null>(null);
  const [remoteProfileReady, setRemoteProfileReady] = useState(false);
  const [authAccountChecked, setAuthAccountChecked] = useState(!isAuthConfigured);
  const [accountIntent, setAccountIntent] = useState<AuthMode>("create");
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [chartModalStep, setChartModalStep] = useState<"overview" | "birth" | "city">("overview");
  const [transitsDrawn, setTransitsDrawn] = useState(false);
  const [profileTransits, setProfileTransits] = useState<TransitItem[]>([]);
  const [profileNatalSky, setProfileNatalSky] = useState<SkySnapshot | null>(null);
  const [personalTiming, setPersonalTiming] = useState<PersonalTimingResponse | null>(null);
  const [personalTimingStatus, setPersonalTimingStatus] = useState<PersonalTimingStatus>("idle");
  const [personalTimingGenerated, setPersonalTimingGenerated] = useState<LiveGeneratedContent | null>(null);
  const [personalTimingGeneratedStatus, setPersonalTimingGeneratedStatus] = useState<PersonalTimingStatus>("idle");
  const [personalTransitGeneratedContent, setPersonalTransitGeneratedContent] = useState<GeneratedContentMap>(() => new Map());
  const [selectedTransitId, setSelectedTransitId] = useState(sampleTransits[0].id);
  const [skyRefreshKey, setSkyRefreshKey] = useState(() => Date.now());
  const lastRemoteProfileSaveRef = useRef("");
  const [sky, setSky] = useState<SkySnapshot>(() => {
    const initialLocation = withTimeZone(initialLocationState.location);

    return getCurrentSky(initialLocation, skyDateTimeFromInput(dateInputValue(), initialLocation));
  });
  const [skyGeneratedContent, setSkyGeneratedContent] = useState<GeneratedContentMap>(() => new Map());
  const [natalGeneratedContent, setNatalGeneratedContent] = useState<GeneratedContentMap>(() => new Map());
  const [relationshipGeneratedContent, setRelationshipGeneratedContent] = useState<GeneratedContentMap>(() => new Map());
  const [selectedSkyDetail, setSelectedSkyDetail] = useState<SkyDetail | null>(null);
  const [, setContentRegistryVersion] = useState(0);
  const userLifeAreaFocus = userProfile ? normalizeChartSettings(userProfile.settings).lifeAreaFocus : [];
  const activeHouseSignLabelStyle = userProfile
    ? normalizeChartSettings(userProfile.settings).houseSignLabelStyle
    : guestHouseSignLabelStyle;
  const activeTransits = rankTransitsByLifeAreaFocus(profileTransits.length > 0 ? profileTransits : sampleTransits, userLifeAreaFocus);
  const selectedTransit = activeTransits.find((transit) => transit.id === selectedTransitId) ?? activeTransits[0] ?? sampleTransits[0];
  const isSignupMode = mode === "profile" && !userProfile;
  const isFriendsMode = mode === "friends";
  const isProfileMode = mode === "profile" || mode === "account" || mode === "settings";
  const usesFullPageLayout = isProfileMode || isFriendsMode;
  const activeSunriseOrbDegrees = DEFAULT_SUNRISE_ORB_DEGREES;

  function navigateToFriends() {
    const nextTab = initialFriendsTab();

    setSelectedSkyDetail(null);
    updateFriendsTabUrl(nextTab, "push");
    storeFriendsTab(nextTab);
    storePortalMode("friends");
    setFriendsLandingKey((currentKey) => currentKey + 1);
    setMode("friends");
  }

  function navigateToPortalMode(nextMode: PortalMode) {
    setSelectedSkyDetail(null);
    updatePortalModeUrl(nextMode, "push");
    storePortalMode(nextMode);
    setMode(nextMode);
  }

  useEffect(() => {
    function handlePortalUrlChange() {
      const urlMode = portalModeFromUrl();

      if (!urlMode) {
        return;
      }

      const nextMode = urlMode === "member" && !userProfile ? "guest" : urlMode;

      storePortalMode(nextMode);
      setSelectedSkyDetail(null);
      setMode(nextMode);

      if (nextMode === "friends") {
        setFriendsLandingKey((currentKey) => currentKey + 1);
      }
    }

    window.addEventListener("popstate", handlePortalUrlChange);
    window.addEventListener("hashchange", handlePortalUrlChange);

    return () => {
      window.removeEventListener("popstate", handlePortalUrlChange);
      window.removeEventListener("hashchange", handlePortalUrlChange);
    };
  }, [userProfile]);

  useEffect(() => {
    if (!selectedSkyDetail) {
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.scrollingElement?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [selectedSkyDetail]);

  useEffect(() => subscribeContentRegistry(() => {
    setContentRegistryVersion((version) => version + 1);
  }), []);

  useEffect(() => {
    let cancelled = false;

    loadLiveGeneratedContent("sky", skyDate)
      .then((content) => {
        if (!cancelled) {
          setSkyGeneratedContent(content);
        }
      })
      .catch((error) => {
        console.warn("Live Sky interpretations failed to load; unpublished content will remain hidden.", error);
        if (!cancelled) {
          setSkyGeneratedContent(new Map());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [skyDate]);

  useEffect(() => {
    let cancelled = false;
    const shouldLoadNatal = Boolean(userProfile) && ["profile", "friends"].includes(mode);

    if (!shouldLoadNatal) {
      setNatalGeneratedContent(new Map());
      return () => {
        cancelled = true;
      };
    }

    Promise.all([
      loadLiveGeneratedContent("natal", skyDate),
      loadLiveGeneratedContent("you", skyDate)
    ])
      .then((maps) => {
        if (!cancelled) {
          setNatalGeneratedContent(mergeGeneratedContentMaps(...maps));
        }
      })
      .catch((error) => {
        console.warn("Live natal interpretations failed to load; unpublished content will remain hidden.", error);
        if (!cancelled) {
          setNatalGeneratedContent(new Map());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mode, skyDate, userProfile]);

  useEffect(() => {
    let cancelled = false;
    const shouldLoadRelationships = Boolean(userProfile) && mode === "friends";

    if (!shouldLoadRelationships) {
      setRelationshipGeneratedContent(new Map());
      return () => {
        cancelled = true;
      };
    }

    Promise.all([
      loadLiveGeneratedContent("relationship", skyDate),
      loadLiveGeneratedContent("synastry", skyDate),
      loadLiveGeneratedContent("composite", skyDate)
    ])
      .then((maps) => {
        if (!cancelled) {
          setRelationshipGeneratedContent(mergeGeneratedContentMaps(...maps));
        }
      })
      .catch((error) => {
        console.warn("Live relationship interpretations failed to load; unpublished content will remain hidden.", error);
        if (!cancelled) {
          setRelationshipGeneratedContent(new Map());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mode, skyDate, userProfile]);

  useEffect(() => {
    if (!datePickerOpen) {
      return;
    }

    const firstPickerButton = datePickerRef.current?.querySelector<HTMLButtonElement>("button");
    firstPickerButton?.focus();

    function closeDatePicker(restoreFocus = true) {
      setDatePickerOpen(false);
      if (restoreFocus) {
        (mobileDatePickerTriggerRef.current ?? datePickerTriggerRef.current)?.focus();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;

      if (
        !target ||
        datePickerRef.current?.contains(target) ||
        datePickerTriggerRef.current?.contains(target) ||
        mobileDatePickerTriggerRef.current?.contains(target)
      ) {
        return;
      }

      closeDatePicker(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDatePicker();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [datePickerOpen]);

  useEffect(() => {
    if (!mobileSkyControlsOpen) {
      return;
    }

    function closeMobileSkyControls(restoreFocus = true) {
      setMobileSkyControlsOpen(false);
      if (restoreFocus) {
        mobileDatePickerTriggerRef.current?.focus();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;

      if (
        !target ||
        mobileSkyControlsRef.current?.contains(target) ||
        mobileDatePickerTriggerRef.current?.contains(target)
      ) {
        return;
      }

      closeMobileSkyControls(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileSkyControls();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileSkyControlsOpen]);

  useEffect(() => {
    if (!cityPickerOpen) {
      return;
    }

    cityPickerInputRef.current?.focus();

    function closeCityPicker(restoreFocus = true) {
      setCityPickerOpen(false);
      if (restoreFocus) {
        cityPickerTriggerRef.current?.focus();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;

      if (
        !target ||
        cityPickerRef.current?.contains(target) ||
        cityPickerTriggerRef.current?.contains(target)
      ) {
        return;
      }

      closeCityPicker(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCityPicker();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [cityPickerOpen]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const activeMenuItem = menuRef.current?.querySelector<HTMLButtonElement>("[role='menuitem'].active");
    const firstMenuItem = menuRef.current?.querySelector<HTMLButtonElement>("[role='menuitem']");
    (activeMenuItem ?? firstMenuItem)?.focus();

    function closeMenu(restoreFocus = true) {
      setMenuOpen(false);
      if (restoreFocus) {
        menuTriggerRef.current?.focus();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;

      if (
        !target ||
        menuRef.current?.contains(target) ||
        menuTriggerRef.current?.contains(target)
      ) {
        return;
      }

      closeMenu(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (!menuRef.current?.contains(document.activeElement)) {
        return;
      }

      const menuItems = Array.from(menuRef.current.querySelectorAll<HTMLButtonElement>("[role='menuitem']"));
      const currentIndex = menuItems.findIndex((item) => item === document.activeElement);

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex = currentIndex < 0
          ? 0
          : (currentIndex + direction + menuItems.length) % menuItems.length;

        menuItems[nextIndex]?.focus();
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        menuItems[0]?.focus();
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        menuItems[menuItems.length - 1]?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    let animationFrame = 0;
    let scrolled = false;

    function updateScrolled() {
      const scrollTop = Math.max(
        window.scrollY,
        document.documentElement.scrollTop,
        document.body.scrollTop,
        document.scrollingElement?.scrollTop ?? 0
      );
      const nextScrolled = scrollTop > 8;

      if (nextScrolled === scrolled) {
        return;
      }

      scrolled = nextScrolled;
      document.documentElement.toggleAttribute("data-scrolled", scrolled);
    }

    function scheduleUpdateScrolled() {
      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        updateScrolled();
      });
    }

    updateScrolled();
    window.addEventListener("scroll", scheduleUpdateScrolled, { passive: true });

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }

      window.removeEventListener("scroll", scheduleUpdateScrolled);
      document.documentElement.removeAttribute("data-scrolled");
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const skyLocation = withTimeZone(location);
    const selectedDateTime = skyDateTimeFromInput(skyDate, skyLocation, new Date(skyRefreshKey));

    setSky(getCurrentSky(skyLocation, selectedDateTime));
    getAstrodienstSky(skyLocation, selectedDateTime, { includeTransitWindows: true })
      .then((nextSky) => {
        if (!cancelled) {
          setSky(nextSky);
        }
      })
      .catch((error) => {
        console.warn("Swiss Ephemeris sky calculation failed; using static sky snapshot.", error);
        if (!cancelled) {
          setSky(getCurrentSky(skyLocation, selectedDateTime));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location, skyDate, skyRefreshKey]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      window.localStorage.setItem(selectedThemeStorageKey, theme);
    } catch {
      return;
    }
  }, [theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem(sunriseOrbStorageKey, sunriseOrbEnabled ? "true" : "false");
    } catch {
      return;
    }
  }, [sunriseOrbEnabled]);

  useEffect(() => {
    try {
      window.localStorage.setItem(dyslexiaFontStorageKey, dyslexiaFriendlyFont ? "true" : "false");
    } catch {
      return;
    }
  }, [dyslexiaFriendlyFont]);

  useEffect(() => {
    try {
      window.localStorage.setItem(houseSignLabelStyleStorageKey, guestHouseSignLabelStyle);
    } catch {
      return;
    }
  }, [guestHouseSignLabelStyle]);

  useEffect(() => {
    document.documentElement.dataset.sunriseOrb = sunriseOrbEnabled ? "true" : "false";
    document.documentElement.classList.toggle("orb-off", !sunriseOrbEnabled);
    document.documentElement.style.setProperty("--sunrise-orb-degrees", `${activeSunriseOrbDegrees}`);
  }, [activeSunriseOrbDegrees, sunriseOrbEnabled]);

  useEffect(() => {
    document.documentElement.dataset.dyslexiaFont = dyslexiaFriendlyFont ? "true" : "false";
  }, [dyslexiaFriendlyFont]);

  useEffect(() => {
    if (!userProfile && isAuthenticatedPortalMode(mode)) {
      return;
    }

    storePortalMode(mode);
  }, [mode, userProfile]);

  useEffect(() => {
    if (mode !== "friends") {
      return;
    }

    storePortalMode("friends");

    if (!isFriendsUrl()) {
      updateFriendsTabUrl(initialFriendsTab(), "replace");
    }
  }, [mode]);

  useEffect(() => {
    if (!hasLocationPreference) {
      return;
    }

    try {
      window.localStorage.setItem(selectedLocationStorageKey, JSON.stringify(location));
    } catch {
      return;
    }
  }, [hasLocationPreference, location]);

  useEffect(() => {
    try {
      if (userProfile) {
        window.localStorage.setItem(userProfileStorageKey, JSON.stringify(userProfile));
      } else {
        window.localStorage.removeItem(userProfileStorageKey);
      }
    } catch {
      return;
    }
  }, [userProfile]);

  useEffect(() => {
    if (!remoteAccountId || !remoteProfileReady || !userProfile) {
      return;
    }

    let cancelled = false;
    const payload = createProfilePersistencePayload({
      profile: userProfile,
      theme,
      sunriseOrbEnabled,
      dyslexiaFriendlyFont,
      selectedLocation: hasLocationPreference ? location : null
    });
    const serializedPayload = JSON.stringify(payload);

    if (serializedPayload === lastRemoteProfileSaveRef.current) {
      return;
    }

    lastRemoteProfileSaveRef.current = serializedPayload;
    upsertPersistedProfile(remoteAccountId, payload)
      .catch((error) => {
        if (!cancelled) {
          lastRemoteProfileSaveRef.current = "";
          console.warn("Supabase profile persistence failed; using local profile cache.", error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    remoteAccountId,
    remoteProfileReady,
    userProfile,
    theme,
    sunriseOrbEnabled,
    dyslexiaFriendlyFont,
    hasLocationPreference,
    location
  ]);

  useEffect(() => {
    if (!userProfile) {
      return;
    }

    const primaryChart = userProfile.charts[0];
    const birthDate = validChartBirthDate(primaryChart);
    const birthCity = validChartBirthCity(primaryChart);
    const birthTime = validChartBirthTime(primaryChart);

    if (!birthDate || !birthCity || !birthTime) {
      setProfileNatalSky(null);
      return;
    }

    const unknownBirthTime = birthTime === "Time unknown";
    let cancelled = false;
    const birthLocation = withTimeZone(primaryChart?.birthLocation ?? locationFromLabel(birthCity));
    const birthDateTime = zonedDateTimeToUtc(birthDate, unknownBirthTime ? "12:00 PM" : birthTime, birthLocation.timeZone);

    getAstrodienstSky(birthLocation, birthDateTime)
      .then((natalSky) => {
        if (cancelled) {
          return;
        }

        const natalBigThree = natalBigThreeFromSky(natalSky, unknownBirthTime);
        const nextTransits = rankedProfileTransits(sky, natalSky, birthDate, activeSunriseOrbDegrees);

        setProfileNatalSky(natalSky);
        setProfileTransits(nextTransits);
        setTransitsDrawn(true);
        setSelectedTransitId((currentId) => (
          nextTransits.some((transit) => transit.id === currentId)
            ? currentId
            : nextTransits[0]?.id ?? sampleTransits[0].id
        ));

        setUserProfile((currentProfile) => {
          if (!currentProfile || currentProfile.id !== userProfile.id) {
            return currentProfile;
          }

          const currentChart = currentProfile.charts[0];
          const shouldUpdateChartLocation = currentChart?.birthLocation?.timeZone !== birthLocation.timeZone;
          const nextRising = natalBigThree.rising;

          if (
            currentProfile.sun === natalBigThree.sun
            && currentProfile.moon === natalBigThree.moon
            && currentProfile.rising === nextRising
            && !shouldUpdateChartLocation
          ) {
            return currentProfile;
          }

          return {
            ...currentProfile,
            sun: natalBigThree.sun,
            moon: natalBigThree.moon,
            rising: nextRising,
            charts: currentChart
              ? [{ ...currentChart, birthLocation }, ...currentProfile.charts.slice(1)]
              : currentProfile.charts
          };
        });
      })
      .catch(() => {
        return;
      });

    return () => {
      cancelled = true;
    };
  }, [
    userProfile?.id,
    userProfile?.sun,
    userProfile?.moon,
    userProfile?.rising,
    userProfile?.charts[0]?.birthDate,
    userProfile?.charts[0]?.birthTime,
    userProfile?.charts[0]?.birthCity,
    userProfile?.charts[0]?.birthLocation?.label,
    userProfile?.charts[0]?.birthLocation?.timeZone,
    sky.generatedAt,
    activeSunriseOrbDegrees
  ]);

  useEffect(() => {
    if (!userProfile || !isTldrAstroApiConfigured) {
      setPersonalTiming(null);
      setPersonalTimingStatus("idle");
      return;
    }

    const primaryChart = userProfile.charts[0];
    const natalSubject = apiSubjectFromUserChart(userProfile, primaryChart, userProfile.settings);
    const currentLocation = userProfile.currentLocationData
      ? withTimeZone(userProfile.currentLocationData)
      : userProfile.currentLocation
        ? locationFromLabel(userProfile.currentLocation)
        : null;

    if (!natalSubject || !natalSubject.datetime.timeKnown || !currentLocation) {
      setPersonalTiming(null);
      setPersonalTimingStatus("idle");
      return;
    }

    let cancelled = false;
    setPersonalTimingStatus("loading");

    getPersonalTiming({
      natalSubject,
      targetDatetime: {
        date: skyDate,
        time: "12:00",
        timeKnown: true,
        timeZone: currentLocation.timeZone
      },
      targetLocation: currentLocation,
      settings: apiSettingsFromChartSettings(userProfile.settings),
      includeContentFacts: true,
      maxTransits: 8
    })
      .then((response) => {
        if (!cancelled) {
          setPersonalTiming(response);
          setPersonalTimingStatus("ready");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn("TLDR Astro personal timing API failed; using local transit rows.", error);
          setPersonalTiming(null);
          setPersonalTimingStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    userProfile?.id,
    userProfile?.name,
    userProfile?.settings,
    userProfile?.charts[0]?.birthDate,
    userProfile?.charts[0]?.birthTime,
    userProfile?.charts[0]?.birthCity,
    userProfile?.charts[0]?.birthLocation?.label,
    userProfile?.charts[0]?.birthLocation?.timeZone,
    userProfile?.currentLocation,
    userProfile?.currentLocationData?.label,
    userProfile?.currentLocationData?.timeZone,
    skyDate
  ]);

  useEffect(() => {
    const primaryChart = userProfile?.charts[0];

    if (!userProfile || !remoteAccountId || !primaryChart || !personalTiming || personalTimingStatus !== "ready") {
      setPersonalTimingGenerated(null);
      setPersonalTimingGeneratedStatus("idle");
      return;
    }

    let cancelled = false;
    const subjectType: UserGeneratedSubjectType = "you_update";
    const subjectId = primaryChart.id;
    const contentKey = personalDailyGeneratedContentKey(skyDate);
    const timing = personalTiming;
    const profile = userProfile;

    async function loadOrGeneratePersonalTimingSummary() {
      setPersonalTimingGeneratedStatus("loading");
      try {
        const existing = await loadUserGeneratedInterpretation({
          subjectType,
          subjectId,
          contentKey,
          targetDate: skyDate
        });

        if (cancelled) {
          return;
        }

        if (existing) {
          setPersonalTimingGenerated(existing);
          setPersonalTimingGeneratedStatus("ready");
          return;
        }

        const generated = await generateUserContent({
          subjectType,
          subjectId,
          contentKey,
          surface: "you",
          mode: "feed",
          eventType: "you-daily-horoscope",
          headline: "TLDR",
          targetDate: skyDate,
          facts: personalTimingGenerationFacts(timing, profile, skyDate),
          knowledgeIds: personalTimingKnowledgeIds(timing),
          sourceSnapshot: {
            source: "tldrastro-personal-timing-api",
            targetDate: skyDate,
            chartId: subjectId
          },
          voiceNotes: [
            "Write this as the user's personal daily horoscope for the Updates page.",
            "Summarize the most important information from all of today's aspects, transits, and timing signals.",
            "Start the summary with 'TLDR:' followed by the plainest useful takeaway.",
            "Sound like a sharp human astrologer writing in the TLDR Astro voice: specific, plainspoken, observant, emotionally precise, and not overly mystical.",
            "Name the concrete pressure, choice, behavior, or relationship pattern the user may notice today.",
            "Use direct sentences with clear verbs: 'You may feel...', 'Notice...', 'Name...', 'Try...'.",
            "Prefer: 'You may feel a quiet pressure today, even if you cannot explain exactly why. Notice where it shows up in your body before trying to solve it. Naming it honestly may be enough for now.'",
            "Do not write like: 'There can be a low hum of pressure today that is hard to name out loud. It tends to live in the body before it becomes a thought.'",
            "Avoid vague phrases like energy, invitation, portal, lean into, the universe, journey, alignment, may be asking, low hum, lives in the body, or hard to name out loud.",
            "Do not make this an annual profection explanation. The annual timing card appears separately below.",
            "Do not use the words profection, time lord, generated, source-backed, backend, or knowledge base.",
            "Keep it warm, specific, practical, and around 70 to 110 words."
          ].join("\n")
        });

        if (!cancelled) {
          setPersonalTimingGenerated(generated);
          setPersonalTimingGeneratedStatus(generated ? "ready" : "error");
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Personalized You update generation failed; using timing fallback.", error);
          setPersonalTimingGenerated(null);
          setPersonalTimingGeneratedStatus("error");
        }
      }
    }

    void loadOrGeneratePersonalTimingSummary();

    return () => {
      cancelled = true;
    };
  }, [
    personalTiming,
    personalTimingStatus,
    remoteAccountId,
    skyDate,
    userProfile?.id,
    userProfile?.name,
    userProfile?.sun,
    userProfile?.moon,
    userProfile?.rising,
    userProfile?.charts[0]?.id
  ]);

  useEffect(() => {
    const primaryChart = userProfile?.charts[0];

    if (!userProfile || !remoteAccountId || !primaryChart || !transitsDrawn) {
      setPersonalTransitGeneratedContent(new Map());
      return;
    }

    const profile = userProfile;
    const subjectId = primaryChart.id;
    const transits = rankTransitsByLifeAreaFocus(profileTransits.length > 0 ? profileTransits : sampleTransits, normalizeChartSettings(profile.settings).lifeAreaFocus).slice(0, 8);

    if (transits.length === 0) {
      setPersonalTransitGeneratedContent(new Map());
      return;
    }

    let cancelled = false;

    async function loadOrGenerateTransitContent() {
      const nextContent = new Map<string, LiveGeneratedContent>();

      try {
        for (const transit of transits) {
          const contentKey = personalTransitGeneratedContentKey(transit, skyDate);
          const existing = await loadUserGeneratedInterpretation({
            subjectType: "you_transit",
            subjectId,
            contentKey,
            targetDate: skyDate
          });

          if (cancelled) {
            return;
          }

          if (existing) {
            nextContent.set(contentKey, existing);
          }
        }

        if (!cancelled) {
          setPersonalTransitGeneratedContent(new Map(nextContent));
        }

        for (const transit of transits) {
          const contentKey = personalTransitGeneratedContentKey(transit, skyDate);

          if (nextContent.has(contentKey)) {
            continue;
          }

          const timing = transitItemTimingDisplay(transit, transitForm.chartDate);
          const generated = await generateUserContent({
            subjectType: "you_transit",
            subjectId,
            contentKey,
            surface: "you",
            mode: "in_depth",
            eventType: "you-transit-to-natal",
            headline: `${transit.transitPlanet} ${transit.aspect} your ${transit.natalPoint}`,
            targetDate: skyDate,
            facts: {
              type: "you_transit_to_natal_description",
              targetDate: skyDate,
              person: {
                name: profile.name,
                bigThree: {
                  sun: profile.sun,
                  moon: profile.moon,
                  rising: profile.rising
                }
              },
              transit: compactTransitItemFact(transit, skyDate),
              timing: {
                durationLabel: timing.durationLabel,
                rangeLabel: timing.rangeLabel,
                label: timing.label
              }
            },
            knowledgeIds: [transitNatalContentId(transit.transitPlanet, transit.aspect, transit.natalPoint)],
            sourceSnapshot: {
              source: "tldrastro-local-transits",
              targetDate: skyDate,
              chartId: subjectId,
              transitId: transit.id
            },
            voiceNotes: [
              "Write this as a personalized explanation for one transit-to-natal aspect card.",
              `Explain what it means to have ${transit.transitPlanet} ${transit.aspect} the user's natal ${transit.natalPoint}.`,
              "Start the summary with 'TLDR:' and make it one concrete sentence for the collapsed card.",
              "Return 2 to 3 sections. Each section body must start with 'TLDR:' and then explain the point in grounded, specific language.",
              "Sound like a sharp human astrologer writing in the TLDR Astro voice: specific, plainspoken, observant, emotionally precise, and not overly mystical.",
              "Name the concrete pressure, choice, behavior, or relationship pattern this aspect can describe.",
              "Use direct sentences with clear verbs: 'You may feel...', 'Notice...', 'Name...', 'Try...'.",
              "Prefer: 'You may feel a quiet pressure today, even if you cannot explain exactly why. Notice where it shows up in your body before trying to solve it. Naming it honestly may be enough for now.'",
              "Do not write like: 'There can be a low hum of pressure today that is hard to name out loud. It tends to live in the body before it becomes a thought.'",
              "Avoid vague phrases like energy, invitation, portal, lean into, the universe, journey, alignment, may be asking, low hum, lives in the body, or hard to name out loud.",
              "Keep it practical. Avoid generic fortune-telling.",
              "Do not mention databases, generated content, source-backed content, or knowledge base."
            ].join("\n")
          });

          if (cancelled) {
            return;
          }

          if (generated) {
            nextContent.set(contentKey, generated);
            setPersonalTransitGeneratedContent(new Map(nextContent));
          }
        }

      } catch (error) {
        if (!cancelled) {
          console.warn("Personalized transit generation failed; using transit fallbacks.", error);
        }
      }
    }

    void loadOrGenerateTransitContent();

    return () => {
      cancelled = true;
    };
  }, [
    profileTransits,
    remoteAccountId,
    skyDate,
    transitForm.chartDate,
    transitsDrawn,
    userProfile?.id,
    userProfile?.name,
    userProfile?.sun,
    userProfile?.moon,
    userProfile?.rising,
    userProfile?.settings,
    userProfile?.charts[0]?.id
  ]);

  useEffect(() => {
    let cancelled = false;

    async function applyAuthAccount(account: AuthAccount | null) {
      setAuthAccountChecked(false);

      if (!account) {
        setRemoteAccountId(null);
        setRemoteProfileReady(false);
        lastRemoteProfileSaveRef.current = "";
        setMode(unauthenticatedLandingMode);
        setAuthAccountChecked(true);
        return;
      }

      setRemoteAccountId(account.id);
      setRemoteProfileReady(false);

      const pendingForm = readPendingSignupForm();
      const cachedLocalProfile = getInitialUserProfile();
      let persistedProfileId: string | null = null;

      try {
        const persistedProfile = await loadPersistedProfile(account.id);

        if (cancelled) {
          return;
        }

        if (isProfilePersistencePayload(persistedProfile)) {
          persistedProfileId = persistedProfile.profile.id;
          const remoteTheme = persistedProfile.preferences?.theme;
          const remoteSunriseOrb = persistedProfile.preferences?.sunriseOrbEnabled;
          const remoteDyslexiaFont = persistedProfile.preferences?.dyslexiaFriendlyFont;
          const remoteLocation = persistedProfile.preferences?.selectedLocation;
          const accountProfile = profileForAuthAccount(persistedProfile.profile, account);

          setUserProfile(accountProfile);
          if (remoteTheme === "light" || remoteTheme === "dark") {
            setTheme(remoteTheme);
          }
          if (typeof remoteSunriseOrb === "boolean") {
            setSunriseOrbEnabled(remoteSunriseOrb);
          }
          if (typeof remoteDyslexiaFont === "boolean") {
            setDyslexiaFriendlyFont(remoteDyslexiaFont);
          }
          if (isLocationInput(remoteLocation)) {
            const nextLocation = withTimeZone(remoteLocation);

            setLocation(nextLocation);
            setManualLocation(nextLocation.label);
            setHasLocationPreference(true);
          }
        } else {
          setUserProfile(profileForAuthAccount(cachedLocalProfile ?? createUserProfile(pendingForm, "email", account), account));
        }

        try {
          await migrateLocalManualChartsToRemote(account.id, [
            cachedLocalProfile?.id,
            persistedProfileId,
            account.id
          ]);
        } catch (migrationError) {
          console.warn("Local manual chart migration failed; charts will remain in the local cache.", migrationError);
        }
        clearPendingSignupForm();
        setMode((currentMode) => authenticatedLandingMode(currentMode, restoredPortalModeRef.current));
        setRemoteProfileReady(true);
        setAuthAccountChecked(true);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.warn("Supabase profile load failed; using local profile cache.", error);
        setUserProfile(profileForAuthAccount(cachedLocalProfile ?? createUserProfile(pendingForm, "email", account), account));
        try {
          await migrateLocalManualChartsToRemote(account.id, [
            cachedLocalProfile?.id,
            account.id
          ]);
        } catch (migrationError) {
          console.warn("Local manual chart migration failed; charts will remain in the local cache.", migrationError);
        }
        clearPendingSignupForm();
        setMode((currentMode) => authenticatedLandingMode(currentMode, restoredPortalModeRef.current));
        setRemoteProfileReady(true);
        setAuthAccountChecked(true);
      }
    }

    getAuthAccount()
      .then((account) => {
        if (cancelled) {
          return;
        }

        void applyAuthAccount(account);
      })
      .catch(() => {
        if (!cancelled) {
          setAuthAccountChecked(true);
        }
        return;
      });

    const unsubscribe = onAuthAccountChange((account) => {
      if (cancelled) {
        return;
      }

      void applyAuthAccount(account);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (hasLocationPreference || !("geolocation" in navigator)) {
      return;
    }

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          label: "Current location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        reverseGeocodeCity(nextLocation.latitude, nextLocation.longitude)
          .catch(() => null)
          .then((mappedLocation) => {
            if (cancelled) {
              return;
            }

            const resolvedLocation = withTimeZone(mappedLocation ?? nextLocation);

            setLocation(resolvedLocation);
            setManualLocation(resolvedLocation.label);
            setHasLocationPreference(true);
          });
      },
      () => {
        return;
      },
      {
        enableHighAccuracy: false,
        maximumAge: 600000,
        timeout: 7000
      }
    );

    return () => {
      cancelled = true;
    };
  }, [hasLocationPreference]);

  useEffect(() => {
    function refreshSky() {
      setSkyRefreshKey(Date.now());
    }

    window.addEventListener("pageshow", refreshSky);

    return () => {
      window.removeEventListener("pageshow", refreshSky);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const query = manualLocation.trim();

    if (!cityPickerOpen || !hasMapboxToken() || query.length < 2) {
      setCitySuggestions([]);
      setCitySearchStatus("idle");
      return;
    }

    setCitySearchStatus("loading");
    const searchTimer = window.setTimeout(() => {
      searchCities(query)
        .then((suggestions) => {
          if (cancelled) {
            return;
          }

          setCitySuggestions(suggestions);
          setCitySearchStatus(suggestions.length > 0 ? "ready" : "empty");
        })
        .catch(() => {
          if (cancelled) {
            return;
          }

          setCitySuggestions([]);
          setCitySearchStatus("error");
        });
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(searchTimer);
    };
  }, [cityPickerOpen, manualLocation]);

  function applyManualLocation() {
    const nextLocation = locationFromLabel(manualLocation);

    setLocation(nextLocation);
    setManualLocation(nextLocation.label);
    setHasLocationPreference(true);
    setCityPickerOpen(false);
    cityPickerTriggerRef.current?.focus();
  }

  function applyCitySuggestion(suggestion: CitySuggestion) {
    setLocation(withTimeZone({
      label: suggestion.label,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      timeZone: suggestion.timeZone
    }));
    setManualLocation(suggestion.label);
    setHasLocationPreference(true);
    setCitySuggestions([]);
    setCitySearchStatus("idle");
    setCityPickerOpen(false);
    cityPickerTriggerRef.current?.focus();
  }

  function openCreateChartModal({
    prefill = false,
    step = "overview"
  }: {
    prefill?: boolean;
    step?: "overview" | "birth" | "city";
  } = {}) {
    setChartModalStep(step);

    if (!prefill) {
      const blankForm = createBlankTransitForm();
      setTransitForm(userProfile ? { ...blankForm, name: userProfile.name } : blankForm);
      setChartModalOpen(true);
      return;
    }

    if (userProfile) {
      const primaryChart = userProfile.charts[0];
      const birthDate = primaryChart?.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(primaryChart.birthDate) ? primaryChart.birthDate : "";
      const birthDateParts = splitSignupBirthDate(birthDate);
      const unknownBirthTime = primaryChart?.birthTime === "Time unknown";
      const birthTimeParts = splitSignupBirthTime(unknownBirthTime ? "12:00 PM" : primaryChart?.birthTime ?? "");

      setTransitForm((currentForm) => ({
        ...currentForm,
        name: userProfile.name,
        birthPlace: primaryChart?.birthCity && primaryChart.birthCity !== "Birth city needed" ? primaryChart.birthCity : "",
        birthLocation: primaryChart?.birthLocation ?? null,
        birthMonth: birthDateParts.month,
        birthDay: birthDateParts.day,
        birthYear: birthDateParts.year,
        birthHour: birthTimeParts.hour,
        birthMinute: birthTimeParts.minute,
        birthMeridiem: birthTimeParts.meridiem,
        unknownBirthTime,
        currentLocation: userProfile.currentLocation ?? currentForm.currentLocation,
        currentLocationData: userProfile.currentLocationData ?? currentForm.currentLocationData
      }));
    }

    setChartModalOpen(true);
  }

  async function drawTransitChart({
    closeModal = true,
    nextStep
  }: {
    closeModal?: boolean;
    nextStep?: "overview" | "birth" | "city";
  } = {}) {
    const currentCity = transitForm.currentLocation.trim();
    let resolvedCurrentLocationData = transitForm.currentLocationData;
    const nextBirthDate = formatSignupBirthDate({
      month: transitForm.birthMonth,
      day: transitForm.birthDay,
      year: transitForm.birthYear
    });
    const nextBirthTime = transitForm.unknownBirthTime
      ? "Time unknown"
      : formatSignupBirthTime({
        hour: transitForm.birthHour,
        minute: transitForm.birthMinute,
        meridiem: transitForm.birthMeridiem
      }) || "Birth time needed";
    const nextName = transitForm.name.trim();
    const birthCity = transitForm.birthPlace.trim();
    const birthLocation = birthCity
      ? transitForm.birthLocation?.label === birthCity
        ? withTimeZone(transitForm.birthLocation)
        : locationFromLabel(birthCity)
      : null;

    if (currentCity) {
      const nextLocation = transitForm.currentLocationData?.label === currentCity
        ? transitForm.currentLocationData
        : locationFromLabel(currentCity);

      resolvedCurrentLocationData = nextLocation;
      setLocation(nextLocation);
      setManualLocation(nextLocation.label);
      setTransitForm((currentForm) => ({
        ...currentForm,
        currentLocation: nextLocation.label
      }));
      setHasLocationPreference(true);
    }

    if (userProfile) {
      const primaryChart = userProfile.charts[0];
      const nextProfileName = nextName || userProfile.name;
      let nextChart: UserChart = {
        id: primaryChart?.id ?? `chart-${Date.now()}`,
        name: chartNameFromProfile(nextProfileName),
        type: "Birth chart",
        birthDate: nextBirthDate || "Birth date needed",
        birthTime: nextBirthTime,
        birthCity: birthCity || "Birth city needed",
        birthLocation
      };
      let nextSun = nextBirthDate ? zodiacFromBirthDate(nextBirthDate) : userProfile.sun;
      let nextMoon = userProfile.moon;
      let nextRising = transitForm.unknownBirthTime || nextBirthTime === "Birth time needed" ? "Rising pending" : userProfile.rising;

      if (nextBirthDate && birthLocation && nextBirthTime !== "Birth time needed") {
        const birthDateTime = zonedDateTimeToUtc(
          nextBirthDate,
          transitForm.unknownBirthTime ? "12:00 PM" : nextBirthTime,
          birthLocation.timeZone
        );
        const natalSky = await getAstrodienstSky(birthLocation, birthDateTime);
        const natalBigThree = natalBigThreeFromSky(natalSky, transitForm.unknownBirthTime);
        const nextTransits = rankedProfileTransits(sky, natalSky, nextBirthDate, activeSunriseOrbDegrees);

        nextSun = natalBigThree.sun;
        nextMoon = natalBigThree.moon;
        nextRising = natalBigThree.rising;
        nextChart = { ...nextChart, birthLocation: birthLocation };
        setProfileTransits(nextTransits);
        setSelectedTransitId(nextTransits[0]?.id ?? sampleTransits[0].id);
      }

      setUserProfile({
        ...userProfile,
        name: nextProfileName,
        sun: nextSun,
        moon: nextMoon,
        rising: nextRising,
        currentLocation: currentCity || userProfile.currentLocation,
        currentLocationData: resolvedCurrentLocationData ?? userProfile.currentLocationData,
        settings: normalizeChartSettings(userProfile.settings),
        charts: [nextChart, ...userProfile.charts.slice(1)]
      });
    }

    setTransitsDrawn(true);
    setChartModalOpen(!closeModal);
    if (nextStep) {
      setChartModalStep(nextStep);
    }
    navigateToPortalMode(userProfile ? "profile" : "guest");
  }

  const isTodayMode = mode === "guest" || mode === "member";
  const needsChartSetup = Boolean(userProfile && !hasCompleteChartSetup(userProfile));
  const todaySkyDate = dateInputValue();
  const tomorrowSkyDate = dateInputValue(new Date(localDayStart(new Date()).getTime() + 86_400_000));
  const skyFullChartTitleId = "sky-full-chart-title";
  const skyFullChartMeta = `${formatSkyFullChartDate(skyDate)} · ${compactCityLabel(sky.location.label)}`;

  function selectSkyDateFromMobileControls(nextDate: string) {
    setSkyDate(nextDate);
    setDatePickerOpen(false);
    setCityPickerOpen(false);
    setMobileSkyControlsOpen(false);
  }

  function openMobileDatePicker() {
    setMobileSkyControlsOpen(false);
    setCityPickerOpen(false);
    setDatePickerOpen(true);
  }

  function openMobileCityPicker() {
    setMobileSkyControlsOpen(false);
    setDatePickerOpen(false);
    setCityPickerOpen(true);
  }

  return (
    <main className={`app-shell theme-${theme} mode-${selectedSkyDetail ? "detail" : mode} ${sunriseOrbEnabled ? "sunrise-orb-enabled" : "sunrise-orb-disabled"} ${dyslexiaFriendlyFont ? "dyslexia-font-enabled" : "dyslexia-font-disabled"} ${isSignupMode ? "auth-mode" : ""}`}>
      {!isSignupMode && (
        <header className="topbar">
          <div className="nav-pill">
            <button
              className="brand-dot"
              type="button"
              aria-label="Home"
              onClick={() => navigateToPortalMode(userProfile ? "member" : "guest")}
            >
              <BrandAsterisk size={22} />
            </button>
            <button
              className="brand-word"
              type="button"
              aria-label="TLDR Astro home"
              onClick={() => navigateToPortalMode(userProfile ? "member" : "guest")}
            >
              TLDR Astro
            </button>

            <nav className="site-nav" aria-label="Primary navigation">
              <button className={mode === "guest" || mode === "member" ? "active" : ""} onClick={() => navigateToPortalMode(userProfile ? "member" : "guest")}>
                <SkyNavIcon size={18} />
                <span>Sky</span>
              </button>
              {userProfile && (
                <>
                  <button
                    className={`account-nav ${mode === "profile" ? "active" : ""}`}
                    type="button"
                    onClick={() => navigateToPortalMode("profile")}
                  >
                    <SmileNavIcon />
                    <span>You</span>
                  </button>
                  <button
                    className={`primary-friends-nav ${mode === "friends" ? "active" : ""}`}
                    type="button"
                    onClick={navigateToFriends}
                  >
                    <FriendsNavIcon size={22} />
                    <span>Friends</span>
                  </button>
                </>
              )}
            </nav>
          </div>

        <div className="topbar-actions">
          {isTodayMode && (
            <button
              className="sky-header-date-button"
              type="button"
              ref={mobileDatePickerTriggerRef}
              aria-expanded={mobileSkyControlsOpen}
              aria-controls="mobile-sky-controls"
              aria-label={`${formatSkyHeaderDateLabel(skyDate)}, ${compactCityLabel(sky.location.label)}`}
              onClick={() => {
                setCityPickerOpen(false);
                setDatePickerOpen(false);
                setMenuOpen(false);
                setMobileSkyControlsOpen((isOpen) => !isOpen);
              }}
            >
              <CalendarDays className="sky-header-date-button__calendar" aria-hidden="true" />
              <span className="sky-header-date-button__date">{formatSkyHeaderDateLabel(skyDate)}</span>
              <ChevronDown className="sky-header-date-button__chevron" size={16} aria-hidden="true" />
            </button>
          )}
          {isTodayMode && mobileSkyControlsOpen && (
            <div
              className="mobile-sky-controls"
              id="mobile-sky-controls"
              ref={mobileSkyControlsRef}
              role="dialog"
              aria-label="Sky controls"
            >
              <div className="mobile-sky-controls__tabs" role="group" aria-label="Sky date shortcuts">
                <button
                  type="button"
                  className={skyDate === todaySkyDate ? "active" : ""}
                  onClick={() => selectSkyDateFromMobileControls(todaySkyDate)}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={skyDate === tomorrowSkyDate ? "active" : ""}
                  onClick={() => selectSkyDateFromMobileControls(tomorrowSkyDate)}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  className={skyDate !== todaySkyDate && skyDate !== tomorrowSkyDate ? "active" : ""}
                  ref={datePickerTriggerRef}
                  onClick={openMobileDatePicker}
                >
                  Date
                </button>
              </div>
              <span className="mobile-sky-controls__label">Location</span>
              <button
                type="button"
                className="mobile-sky-controls__location"
                ref={cityPickerTriggerRef}
                onClick={openMobileCityPicker}
              >
                <MapPin size={18} aria-hidden="true" />
                <span>{compactCityLabel(sky.location.label)}</span>
              </button>
            </div>
          )}
          <button
            type="button"
            className="theme-toggle"
            key={theme}
            aria-pressed={theme === "dark"}
            aria-label="Toggle theme"
            title="Toggle theme"
            onClick={() => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? <Moon size={22} aria-hidden="true" /> : <Sun size={22} aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="menu-toggle"
            ref={menuTriggerRef}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls="site-overflow-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => {
              setMobileSkyControlsOpen(false);
              setMenuOpen((isOpen) => !isOpen);
            }}
          >
            <span className="hamburger-icon" aria-hidden="true">
              <span className="hamburger-line hamburger-line-top" />
              <span className="hamburger-line hamburger-line-middle" />
              <span className="hamburger-line hamburger-line-bottom" />
            </span>
          </button>
          {menuOpen && (
            <div className="site-menu" id="site-overflow-menu" ref={menuRef} role="menu" aria-label="Site menu">
              <button
                className={mode === "guest" || mode === "member" ? "active" : ""}
                type="button"
                role="menuitem"
                onClick={() => {
                  setSelectedSkyDetail(null);
                  navigateToPortalMode(userProfile ? "member" : "guest");
                  setMenuOpen(false);
                }}
              >
                <SkyNavIcon size={20} />
                <span>Sky</span>
              </button>
              {userProfile && (
                <>
                  <button
                    className={mode === "profile" ? "active" : ""}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setSelectedSkyDetail(null);
                      navigateToPortalMode("profile");
                      setMenuOpen(false);
                    }}
                  >
                    <SmileNavIcon />
                    <span>You</span>
                  </button>
                  <button className={`site-menu-friends ${mode === "friends" ? "active" : ""}`} type="button" role="menuitem" onClick={() => { setSelectedSkyDetail(null); navigateToFriends(); setMenuOpen(false); }}>
                    <FriendsNavIcon size={22} />
                    <span>Friends</span>
                  </button>
                  <button className={mode === "account" ? "active" : ""} type="button" role="menuitem" onClick={() => { setSelectedSkyDetail(null); navigateToPortalMode("account"); setMenuOpen(false); }}>
                    <User size={20} aria-hidden="true" />
                    <span>Account</span>
                  </button>
                </>
              )}
              <button className={mode === "settings" ? "active" : ""} type="button" role="menuitem" onClick={() => { setSelectedSkyDetail(null); navigateToPortalMode("settings"); setMenuOpen(false); }}>
                <Settings size={20} aria-hidden="true" />
                <span>Settings</span>
              </button>
              {userProfile ? (
                <button className="site-menu-signout" type="button" role="menuitem" onClick={async () => { setSelectedSkyDetail(null); await signOutAuth(); setUserProfile(null); navigateToPortalMode("profile"); setMenuOpen(false); }}>
                  <LogOut size={20} aria-hidden="true" />
                  <span>Sign out</span>
                </button>
              ) : (
                <div className="site-menu-auth" aria-label="Account actions">
                  <button
                    className="site-menu-join"
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setSelectedSkyDetail(null);
                      setAccountIntent("create");
                      navigateToPortalMode("profile");
                      setMenuOpen(false);
                    }}
                  >
                    Join tldr astro
                  </button>
                  <button
                    className="site-menu-login"
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setSelectedSkyDetail(null);
                      setAccountIntent("login");
                      navigateToPortalMode("profile");
                      setMenuOpen(false);
                    }}
                  >
                    Login
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        </header>
      )}

      {selectedSkyDetail ? (
          <SkyDetailArticle detail={selectedSkyDetail} onClose={() => setSelectedSkyDetail(null)} />
      ) : (
        <>
          <section className={isSignupMode ? "portal-grid page-shell signup-layout" : isFriendsMode ? "portal-grid page-shell friends-layout" : isProfileMode ? "portal-grid page-shell full-page-layout" : "portal-grid page-shell sky-page sky-layout chart-layout"}>
            {isTodayMode && (
              <section className="today-hero" aria-label="Today controls">
                <div className="sky-intro">
                  <h1 className="sky-intro__lead">
                    <span className="sky-intro__lead-desktop">{formatSkyHeroTitle(skyDate)}</span>
                    <span className="sky-intro__lead-mobile">the sky.</span>
                  </h1>
                  <p className="sky-intro__copy">
                    What is up there today, and what it means down here.
                  </p>
                </div>
                {datePickerOpen && (
                  <SkyDatePicker
                    value={skyDate}
                    pickerRef={datePickerRef}
                    onClose={() => {
                      setDatePickerOpen(false);
                      (mobileDatePickerTriggerRef.current ?? datePickerTriggerRef.current)?.focus();
                    }}
                    onSelect={(nextDate) => {
                      setSkyDate(nextDate);
                      setDatePickerOpen(false);
                      (mobileDatePickerTriggerRef.current ?? datePickerTriggerRef.current)?.focus();
                    }}
                  />
                )}
                {cityPickerOpen && (
                  <form
                    className="city-picker hero-city-picker"
                    id="city-picker"
                    ref={cityPickerRef}
                    onSubmit={(event) => {
                      event.preventDefault();
                      applyManualLocation();
                    }}
                  >
                    <label>
                      <span>City</span>
                      <input
                        ref={cityPickerInputRef}
                        value={manualLocation}
                        onChange={(event) => setManualLocation(event.target.value)}
                        aria-label="City"
                        placeholder="Search for a city"
                        autoFocus
                      />
                    </label>
                    <CitySuggestions
                      suggestions={citySuggestions}
                      status={citySearchStatus}
                      mapboxEnabled={hasMapboxToken()}
                      onSelect={applyCitySuggestion}
                    />
                    <div className="city-picker-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setCityPickerOpen(false);
                          cityPickerTriggerRef.current?.focus();
                        }}
                      >
                        Cancel
                      </button>
                      <button type="submit">Update</button>
                    </div>
                  </form>
                )}
                <button
                  className="mobile-full-chart-card"
                  type="button"
                  aria-label="Open full current sky chart"
                  onClick={() => {
                    setDatePickerOpen(false);
                    setCityPickerOpen(false);
                    setMobileSkyControlsOpen(false);
                    setSkyFullChartOpen(true);
                  }}
                >
                  <span className="mobile-full-chart-card__icon" aria-hidden="true">
                    <span className="mobile-full-chart-card__wheel" />
                  </span>
                  <span className="mobile-full-chart-card__copy">
                    <strong>Full chart</strong>
                    <span>The wheel &amp; aspects</span>
                  </span>
                  <span className="mobile-full-chart-card__arrow" aria-hidden="true">
                    <ArrowRight size={18} />
                  </span>
                </button>
                <SkyCards sky={sky} />
              </section>
            )}

            {!isSignupMode && !usesFullPageLayout && (
              <section className="sky-panel sky-chart-column chart-layout__visual" aria-label="Current sky">
                <div className="chart-shell sky-chart-shell">
                  <div className="chart-frame">
                    <SkyWheel
                      positions={sky.positions}
                      aspects={sky.aspects}
                      ascendant={sky.ascendant}
                      ascendantLongitude={sky.ascendantLongitude}
                      midheavenLongitude={sky.midheavenLongitude}
                      houseSignLabelStyle={activeHouseSignLabelStyle}
                      variant="zodiac"
                    />
                  </div>
                </div>
              </section>
            )}

            <section className="detail-panel sky-content-column chart-layout__content" aria-label="Portal details">
              {(mode === "guest" || mode === "member") && (
                <RetrogradeCallout
                  positions={sky.positions}
                  generatedAt={sky.generatedAt}
                  generatedContent={skyGeneratedContent}
                  onOpenDetail={setSelectedSkyDetail}
                />
              )}
              {mode === "guest" && (
                <TodayView
                  positions={sky.positions}
                  aspects={sky.aspects}
                  generatedAt={sky.generatedAt}
                  generatedContent={skyGeneratedContent}
                  lifeAreaFocus={[]}
                  onOpenDetail={setSelectedSkyDetail}
                />
              )}
              {mode === "member" && (
                <TodayView
                  positions={sky.positions}
                  aspects={sky.aspects}
                  generatedAt={sky.generatedAt}
                  generatedContent={skyGeneratedContent}
                  lifeAreaFocus={userLifeAreaFocus}
                  onOpenDetail={setSelectedSkyDetail}
                />
              )}
              {mode === "profile" && (
                userProfile ? (
                  <ProfileView
                    profile={userProfile}
                    onUpdateProfile={setUserProfile}
                    transitForm={transitForm}
                    transitItems={activeTransits}
                    natalSky={profileNatalSky}
                    personalTiming={personalTiming}
                    personalTimingGenerated={personalTimingGenerated}
                    personalTimingGeneratedStatus={personalTimingGeneratedStatus}
                    personalTimingStatus={personalTimingStatus}
                    personalTransitGeneratedContent={personalTransitGeneratedContent}
                    transitsDrawn={transitsDrawn}
                    selectedTransit={selectedTransit}
                    selectedTransitId={selectedTransitId}
                    setSelectedTransitId={setSelectedTransitId}
                    onCreateChart={() => openCreateChartModal()}
                    generatedContent={natalGeneratedContent}
                  />
                ) : (
                  <SignupView
                    initialMode={accountIntent}
                    onClose={() => {
                      setAccountIntent("create");
                      navigateToPortalMode(userProfile ? "profile" : "guest");
                    }}
                    onCreateProfile={(nextProfile) => {
                      setUserProfile(nextProfile);
                      navigateToPortalMode("profile");
                    }}
                  />
                )
              )}
              {mode === "friends" && userProfile && (
                <ManualChartsPanel
                  profile={userProfile}
                  currentSky={sky}
                  profileNatalSky={profileNatalSky}
                  profileTransits={activeTransits}
                  natalGeneratedContent={natalGeneratedContent}
                  relationshipGeneratedContent={relationshipGeneratedContent}
                  landingKey={friendsLandingKey}
                  sunriseOrbDegrees={activeSunriseOrbDegrees}
                  chartOwnerUserId={remoteAccountId ?? userProfile.id}
                  chartsReady={authAccountChecked && (!remoteAccountId || remoteProfileReady)}
                  onOpenDetail={setSelectedSkyDetail}
                />
              )}
              {mode === "account" && userProfile && (
                <AccountView
                  profile={userProfile}
                  onSignOut={async () => {
                    await signOutAuth();
                    setUserProfile(null);
                    navigateToPortalMode("profile");
                  }}
                  onUpdateProfile={setUserProfile}
                />
              )}
              {mode === "settings" && (
                userProfile ? (
                  <SettingsView
                    profile={userProfile}
                    onUpdateProfile={setUserProfile}
                    theme={theme}
                    sunriseOrbEnabled={sunriseOrbEnabled}
                    onThemeChange={setTheme}
                    onSunriseOrbChange={setSunriseOrbEnabled}
                    dyslexiaFriendlyFont={dyslexiaFriendlyFont}
                    onDyslexiaFontChange={setDyslexiaFriendlyFont}
                    onHouseSignLabelStyleChange={setGuestHouseSignLabelStyle}
                  />
                ) : (
                  <GuestSettingsView
                    theme={theme}
                    location={location}
                    sunriseOrbEnabled={sunriseOrbEnabled}
                    onThemeChange={setTheme}
                    onSunriseOrbChange={setSunriseOrbEnabled}
                    dyslexiaFriendlyFont={dyslexiaFriendlyFont}
                    onDyslexiaFontChange={setDyslexiaFriendlyFont}
                    houseSignLabelStyle={guestHouseSignLabelStyle}
                    onHouseSignLabelStyleChange={setGuestHouseSignLabelStyle}
                  />
                )
              )}
            </section>
          </section>

          {isTodayMode && mode === "member" && userProfile && needsChartSetup && (
            <button className="create-chart-fab" type="button" onClick={() => openCreateChartModal()}>
              <span className="create-chart-fab-icon" aria-hidden="true">
                <Sparkles size={18} />
              </span>
              <span className="create-chart-fab-copy">
                <strong>Create your chart</strong>
                <em>{chartFlowStepsLeft(userProfile)} steps left</em>
              </span>
            </button>
          )}

          {skyFullChartOpen && (
            <ModalPortal
              className="sky-full-chart-modal-root"
              panelClassName="sky-full-chart-panel"
              titleId={skyFullChartTitleId}
              width="100vw"
              onClose={() => setSkyFullChartOpen(false)}
            >
              <div className="sky-full-chart-view">
                <header className="sky-full-chart-header">
                  <button className="sky-full-chart-back" type="button" onClick={() => setSkyFullChartOpen(false)}>
                    <ChevronLeft size={24} aria-hidden="true" />
                    <span>Back</span>
                  </button>
                </header>

                <div className="sky-full-chart-body">
                  <h2 className="sr-only" id={skyFullChartTitleId}>Full sky chart</h2>
                  <div className="sky-full-chart-shell">
                    <div className="wheel natal-wheel chart-frame" aria-label={`Full sky chart for ${skyFullChartMeta}`}>
                      <SkyWheel
                        positions={sky.positions}
                        aspects={sky.aspects}
                        ascendant={sky.ascendant}
                        ascendantLongitude={sky.ascendantLongitude}
                        midheavenLongitude={sky.midheavenLongitude}
                        houseSignLabelStyle={activeHouseSignLabelStyle}
                        variant="zodiac"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ModalPortal>
          )}

          {chartModalOpen && (
            <ModalPortal
              className="chart-modal-root"
              panelClassName="chart-modal"
              titleId="chart-modal-title"
              width="640px"
              onClose={() => setChartModalOpen(false)}
            >
                <button className="chart-modal-close modal-close" type="button" aria-label="Close create chart" onClick={() => setChartModalOpen(false)}>
                  ×
                </button>
                <CreateChartFlow
                  form={transitForm}
                  setForm={setTransitForm}
                  profile={userProfile}
                  step={chartModalStep}
                  setStep={setChartModalStep}
                  onSave={drawTransitChart}
                />
            </ModalPortal>
          )}
        </>
      )}

    </main>
  );
}

function locationFromLabel(label: string): LocationInput {
  const seed = label.trim();

  if (!seed) {
    return withTimeZone(defaultLocation);
  }

  const hash = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0);
  const location = {
    label: seed,
    latitude: ((hash % 1400) / 10) - 70,
    longitude: ((hash % 3000) / 10) - 150
  };

  return {
    ...location,
    timeZone: timeZoneForLocation(location)
  };
}

function SkyDatePicker({
  onClose,
  pickerRef,
  value,
  onSelect
}: {
  onClose: () => void;
  pickerRef?: Ref<HTMLElement>;
  value: string;
  onSelect: (value: string) => void;
}) {
  const selectedDate = dateFromInput(value);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const days = calendarDaysFor(visibleMonth);
  const todayValue = dateInputValue();
  const selectedValue = dateInputValue(selectedDate);
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <section className="date-picker" id="sky-date-picker" ref={pickerRef} aria-label="Select sky date">
      <div className="date-picker-header">
        <button className="date-picker-nav" type="button" aria-label="Previous month" onClick={() => setVisibleMonth((month) => addMonths(month, -1))}>
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <strong>{monthLabel(visibleMonth)}</strong>
        <span className="date-picker-header-actions">
          <button className="date-picker-nav" type="button" aria-label="Next month" onClick={() => setVisibleMonth((month) => addMonths(month, 1))}>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
          <button className="date-picker-close picker-close" type="button" aria-label="Close date picker" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </span>
      </div>

      <div className="date-picker-weekdays" aria-hidden="true">
        {weekdayLabels.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="date-picker-grid" role="grid" aria-label={monthLabel(visibleMonth)}>
        {days.map((day) => {
          const dayValue = dateInputValue(day);
          const isSelected = dayValue === selectedValue;
          const isToday = dayValue === todayValue;
          const isOutsideMonth = day.getMonth() !== visibleMonth.getMonth();

          return (
            <button
              key={dayValue}
              type="button"
              className={[
                isSelected ? "selected" : "",
                isToday ? "today" : "",
                isOutsideMonth ? "outside-month" : ""
              ].filter(Boolean).join(" ")}
              aria-label={day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              aria-selected={isSelected}
              role="gridcell"
              onClick={() => onSelect(dayValue)}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <div className="date-picker-actions">
        <button className="date-picker-cancel" type="button" onClick={onClose}>
          Cancel
        </button>
        <button className="date-picker-today" type="button" onClick={() => onSelect(todayValue)}>
          Today
        </button>
      </div>
    </section>
  );
}

function CitySuggestions({
  suggestions,
  status,
  mapboxEnabled,
  onSelect
}: {
  suggestions: CitySuggestion[];
  status: "idle" | "loading" | "ready" | "empty" | "error";
  mapboxEnabled: boolean;
  onSelect: (suggestion: CitySuggestion) => void;
}) {
  if (!mapboxEnabled) {
    return (
      <p className="city-picker-note">
        Add VITE_MAPBOX_ACCESS_TOKEN to enable suggested city search.
      </p>
    );
  }

  if (status === "idle") {
    return <p className="city-picker-note">Start typing to see suggested cities.</p>;
  }

  if (status === "loading") {
    return <p className="city-picker-note">Searching cities...</p>;
  }

  if (status === "error") {
    return <p className="city-picker-note">City suggestions are unavailable right now.</p>;
  }

  if (status === "empty") {
    return <p className="city-picker-note">No city suggestions found.</p>;
  }

  return (
    <div className="city-suggestions" role="listbox" aria-label="Suggested cities">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          type="button"
          role="option"
          onClick={() => onSelect(suggestion)}
        >
          <strong>{suggestion.label}</strong>
          {suggestion.region && <span>{suggestion.region}</span>}
        </button>
      ))}
    </div>
  );
}

function skyDisplayPlanetName(planet: string) {
  return planet === "True Node" ? "North Node" : planet;
}

function retrogradeDetailKicker(position: PlanetPosition) {
  return `${skyDisplayPlanetName(position.planet)} Retrograde`;
}

function retrogradeKnowledgeCopy(
  position: PlanetPosition,
  generated: LiveGeneratedContent | null,
  content: ContentFallback
) {
  const generatedSummary = generated?.summary?.trim() || generatedContentParagraphs(generated)[0];

  if (generatedSummary) {
    return generatedSummary;
  }

  return content.summary || content.body || content.detailParagraphs.find((paragraph) => paragraph.trim()) || "";
}

function ordinalHouse(house: number) {
  const rem100 = house % 100;

  if (rem100 >= 11 && rem100 <= 13) {
    return `${house}th`;
  }

  const suffixes: Record<number, string> = {
    1: "st",
    2: "nd",
    3: "rd"
  };

  return `${house}${suffixes[house % 10] ?? "th"}`;
}

const natalSignatureDescriptions: Record<string, string> = {
  Sun: "Your core self and vitality",
  Moon: "Your inner world and what you need to feel safe",
  Ascendant: "How you meet the world and come across",
  Mercury: "How you think and communicate",
  Venus: "What you value and who you're drawn to",
  Mars: "How you direct your energy and act",
  Jupiter: "Where you grow and reach for more",
  Saturn: "What you commit to and build",
  Uranus: "Where you break the pattern",
  Neptune: "Where you dream and idealize",
  Pluto: "Where you transform and reclaim power"
};

function readableHouseTopic(house: number) {
  return houseLifeAreas[house] ?? "this part of life";
}

const natalHouseFallbackFrames: Record<number, { intro: string; focus: string; lived: string }> = {
  1: {
    intro: "The 1st house is where life asks you to become recognizable to yourself. It speaks to your body, instincts, appearance, and the first impression you make before you explain anything.",
    focus: "your sense of self",
    lived: "how you move, respond, and take up space"
  },
  2: {
    intro: "The 2nd house is where life asks you to understand what is worth keeping. It speaks to money, resources, appetite, self-worth, and the stability you build through repeated choices.",
    focus: "your relationship with worth and security",
    lived: "money, resources, values, and what helps you feel grounded"
  },
  3: {
    intro: "The 3rd house is where life asks you to notice, name, and connect what is happening around you. It speaks to communication, learning, siblings, local movement, and the habits of daily perception.",
    focus: "your everyday mind",
    lived: "conversation, learning, writing, and the way you move through your immediate world"
  },
  4: {
    intro: "The 4th house is where life asks you to build an inner foundation. It speaks to home, family memory, ancestry, emotional security, and the private roots that shape everything else.",
    focus: "your inner foundation",
    lived: "home, family, privacy, and the emotional structures that hold you"
  },
  5: {
    intro: "The 5th house is where life asks you to let the heart become visible. It speaks to creativity, romance, pleasure, play, children, and the desire to make something because it feels alive.",
    focus: "your creative life",
    lived: "pleasure, love, creative risk, and the courage to be seen"
  },
  6: {
    intro: "The 6th house is where life asks you to care for what must be maintained. It speaks to routines, work, health, service, and the small daily habits that decide how sustainable life feels.",
    focus: "your daily life",
    lived: "work, health, maintenance, and the rhythms that keep everything running"
  },
  7: {
    intro: "The 7th house is where life asks you to meet yourself through other people. It speaks to partnership, agreements, attraction, conflict, and the mirrors that show you what cannot be worked out alone.",
    focus: "your one-to-one relationships",
    lived: "partnership, collaboration, conflict, and the agreements you choose"
  },
  8: {
    intro: "The 8th house is where life asks you to face what is shared, hidden, or hard to control. It speaks to intimacy, trust, debt, inheritance, secrecy, and the emotional truth underneath exchange.",
    focus: "your relationship with trust and shared power",
    lived: "intimacy, money entanglements, fear, honesty, and the need for deeper trust"
  },
  9: {
    intro: "The 9th house is where life asks you to look beyond the immediate and familiar. It speaks to the search for meaning through learning, travel, philosophy, spirituality, teaching, and the stories you tell yourself about why you're here.",
    focus: "your search for meaning",
    lived: "belief, study, travel, teaching, and the wider perspective you build from experience"
  },
  10: {
    intro: "The 10th house is where life asks you to become visible through what you build. It speaks to career, reputation, authority, responsibility, and the public shape your life begins to take over time.",
    focus: "your public path",
    lived: "career, reputation, responsibility, and the work of becoming known"
  },
  11: {
    intro: "The 11th house is where life asks you to imagine the future you want to belong to. It speaks to friendship, networks, community, audience, collaboration, and the hopes that pull you beyond private concerns.",
    focus: "your place in the wider circle",
    lived: "friendship, community, collaboration, and long-range hopes"
  },
  12: {
    intro: "The 12th house is where life asks you to listen to what is quiet, hidden, or unfinished. It speaks to solitude, dreams, retreat, grief, imagination, and the material that works beneath ordinary awareness.",
    focus: "your private inner life",
    lived: "rest, retreat, hidden pressure, imagination, and what needs space before it can be named"
  }
};

const natalPlanetFallbackFrames: Record<string, NatalPlacementFrame> = {
  Sun: {
    house: "your identity becomes involved here. You discover who you are by engaging this area directly and letting lived experience clarify your sense of purpose",
    growth: "your sense of purpose",
    integration: "what you believe has to become something you can live from, not just something you understand in theory"
  },
  Moon: {
    house: "your emotional life is pulled into this territory. You look for safety here, and your instincts often respond before you have language for what is happening",
    growth: "your emotional steadiness",
    integration: "your feelings become more trustworthy when they have a real place to land"
  },
  Mercury: {
    house: "your mind keeps returning to these questions. You learn by observing the pattern, naming what you notice, and letting conversation sharpen your understanding",
    growth: "your voice and thinking",
    integration: "what you notice becomes useful when you give it language and let it change how you move"
  },
  Venus: {
    house: "desire, value, and connection are shaped here. You learn what feels worth choosing by noticing what brings ease, beauty, pleasure, or honest attraction into this part of life",
    growth: "your sense of value",
    integration: "what you want becomes clearer when it is tested against what actually feels sustaining"
  },
  Mars: {
    house: "your drive has to find an outlet here. You learn through action, effort, conflict, and the courage to move toward what you want without waiting for every condition to be perfect",
    growth: "your courage",
    integration: "your energy becomes more effective when it has a clear direction and a real problem to meet"
  },
  Jupiter: {
    house: "growth comes through this territory. You tend to find opportunity when you take the larger view, trust your experience, and let this part of life teach you something bigger",
    growth: "your faith in life",
    integration: "your confidence grows when experience gives your optimism something real to stand on"
  },
  Saturn: {
    house: "this becomes a place of responsibility and slow-earned confidence. You may meet pressure here first, but over time you learn what can hold weight",
    growth: "your inner authority",
    integration: "the lesson becomes useful when responsibility turns into self-respect instead of fear"
  },
  Uranus: {
    house: "change does not stay theoretical here. You are learning where freedom matters, where old patterns stop working, and where your life needs more room to breathe",
    growth: "your freedom",
    integration: "the breakthrough matters most when it gives you a more honest way to live"
  },
  Neptune: {
    house: "longing, imagination, and sensitivity gather here. You may idealize this part of life, but you also receive subtle information through it",
    growth: "your imagination",
    integration: "the dream becomes stronger when it is held with enough clarity to survive real life"
  },
  Pluto: {
    house: "this territory carries pressure and depth. You are learning where control, fear, honesty, and transformation have to be faced rather than managed from a distance",
    growth: "your power",
    integration: "what changes you here can eventually become a source of strength, but only after it is met honestly"
  }
};

function natalPlanetHouseParagraph(
  position: PlanetPosition,
  houseFrame: { intro: string; focus: string; lived: string },
  houseLabel: string
) {
  const focus = houseFrame.focus;
  const title = natalPlacementFullTitle(position);

  switch (position.planet) {
    case "Sun":
      return `Your identity grows through ${focus}. You are not here to keep this part of life abstract or inherited. With your ${title}, you discover who you are through ${houseFrame.lived}, and by testing what gives your life purpose against lived experience.`;
    case "Moon":
      return `Your emotional life is shaped through ${focus}. With your ${title}, your body, moods, and instincts respond strongly to what happens here. This is one of the places where you learn what helps you feel safe enough to stay present.`;
    case "Mercury":
      return `Your mind develops through ${focus}. With your ${title}, you learn by noticing patterns, asking better questions, and giving language to what keeps happening in this area of life. What you observe here can change how you think, speak, and move.`;
    case "Venus":
      return `Your sense of value grows through ${focus}. With your ${title}, love, desire, beauty, and attraction become clearer through ${houseFrame.lived}. You learn what feels worth choosing by paying attention to what continues to feel real after the first pull passes.`;
    case "Mars":
      return `Your drive becomes active through ${focus}. With your ${title}, desire, courage, and action are tested through ${houseFrame.lived}. You may feel most alive here when there is something to protect, build, challenge, or move toward with your whole body behind it.`;
    case "Jupiter":
      return `Your growth opens through ${focus}. With your ${title}, opportunity comes through ${houseFrame.lived}. You expand by trusting experience, taking the wider view, and letting this area of life show you what more is possible.`;
    case "Saturn":
      return `Your maturity develops through ${focus}. With your ${title}, responsibility, structure, and time become part of how this area of life takes shape. It may ask more of you at first, but it can become a place where effort turns into authority you can trust.`;
    case "Uranus":
      return `Your freedom develops through ${focus}. With your ${title}, change does not stay theoretical. It arrives through ${houseFrame.lived}, showing you where an old pattern has stopped telling the truth and where your life needs more room to breathe.`;
    case "Neptune":
      return `Your imagination gathers through ${focus}. With your ${title}, sensitivity, longing, compassion, and spiritual perception move through ${houseFrame.lived}. This area can inspire you deeply, but it also asks for enough clarity to keep the dream connected to real life.`;
    case "Pluto":
      return `Your power changes through ${focus}. With your ${title}, intensity gathers around ${houseFrame.lived}. This area can show where control, fear, honesty, and renewal have to be faced directly instead of managed from a distance.`;
    default:
      return `${position.planet} becomes active through ${focus}. With your ${title}, this part of you develops through ${houseFrame.lived}.`;
  }
}

function natalPlanetSignParagraph(position: PlanetPosition, signFrame: { quality: string; motion: string; aliveness: string }) {
  const signTone = natalSignTonePhrases[position.sign] ?? "express this part of you with more honesty and precision";

  switch (position.planet) {
    case "Sun":
      return `There is a ${signFrame.quality} quality to the way your Sun grows here. You are learning to ${signTone}. Your identity becomes stronger when you stop accepting the expected answer and let this sign show what genuinely gives you life.`;
    case "Moon":
      return `There is a ${signFrame.quality} quality to the way your Moon responds here. Your instincts are shaped by the need to ${signTone}. Your body often knows when this pattern is being supported and when it has started protecting itself too hard.`;
    case "Mercury":
      return `There is a ${signFrame.quality} quality to the way Mercury works here. Your perception sharpens when you can ${signTone}. Your mind works best when this pattern has room to observe clearly instead of becoming a habit you cannot question.`;
    case "Venus":
      return `There is a ${signFrame.quality} quality to the way Venus chooses here. Attraction teaches you to ${signTone}. What you value becomes clearer when desire is honest without letting comfort, approval, or chemistry make the whole decision for you.`;
    case "Mars":
      return `There is a ${signFrame.quality} quality to the way Mars acts here. Your drive sharpens when you can ${signTone}. Your energy is strongest when there is a real reason to move and enough self-awareness to keep force from becoming reaction.`;
    case "Jupiter":
      return `There is a ${signFrame.quality} quality to the way Jupiter grows here. Opportunity opens when you can ${signTone}. Your faith works best when it stays tied to experience instead of becoming a story you use to avoid the details.`;
    case "Saturn":
      return `There is a ${signFrame.quality} quality to the way Saturn matures here. The work is to ${signTone}. What lasts here is built slowly, through choices that prove they can hold weight over time.`;
    case "Uranus":
      return `There is a ${signFrame.quality} quality to the way Uranus disrupts here. Breakthrough often begins when you ${signTone}. Freedom becomes useful when it gives you a truer way to live, not just a reason to resist being shaped by anyone else.`;
    case "Neptune":
      return `There is a ${signFrame.quality} quality to the way Neptune dreams here. Your imagination is drawn to ${signTone}. Inspiration becomes more trustworthy when it has enough shape, honesty, and boundary to survive ordinary life.`;
    case "Pluto":
      return `There is a ${signFrame.quality} quality to the way Pluto intensifies here. Transformation often asks you to ${signTone}. Power becomes cleaner when you can tell the truth about what is driving you instead of staying loyal to control.`;
    default:
      return `In ${position.sign}, this placement takes on a ${signFrame.quality} quality. You are learning to ${signTone}.`;
  }
}

const natalSignFallbackFrames: Record<string, { quality: string; motion: string; aliveness: string }> = {
  Aries: {
    quality: "direct and initiating",
    motion: "You are not here to wait until every variable is settled. You learn by beginning, testing your courage, and letting action reveal what thought alone cannot.",
    aliveness: "The more permission you give yourself to move honestly, the more alive this placement becomes."
  },
  Taurus: {
    quality: "steady and embodied",
    motion: "You are not here to rush past what your body knows. You learn by moving slowly enough to recognize what is real, valuable, and worth protecting over time.",
    aliveness: "The more you trust what proves itself, the more grounded this placement becomes."
  },
  Gemini: {
    quality: "curious and responsive",
    motion: "You are not here to settle for one fixed answer too quickly. You learn by asking better questions, making connections, and letting new information change the picture.",
    aliveness: "The more room you give your mind to stay mobile, the more alive this placement becomes."
  },
  Cancer: {
    quality: "protective and intuitive",
    motion: "You are not here to ignore memory, belonging, or care. You learn by listening to your instincts and noticing what helps you feel safe enough to stay present.",
    aliveness: "The more honestly you tend to your emotional roots, the stronger this placement becomes."
  },
  Leo: {
    quality: "expressive and visible",
    motion: "You are not here to hide the warmth of your own heart. You learn by creating, responding generously, and letting what matters to you become recognizable.",
    aliveness: "The more courage you give yourself to be seen, the more alive this placement becomes."
  },
  Virgo: {
    quality: "practical and observant",
    motion: "You are not here to leave everything vague. You learn by refining the pattern, improving what is workable, and turning insight into something useful.",
    aliveness: "The more you let care become craft, the stronger this placement becomes."
  },
  Libra: {
    quality: "relational and balancing",
    motion: "You are not here to understand life in isolation. You learn through contrast, response, beauty, fairness, and the choices that make exchange feel more honest.",
    aliveness: "The more consciously you choose your agreements, the more alive this placement becomes."
  },
  Scorpio: {
    quality: "private and intense",
    motion: "You are not here to stay on the surface. You learn by telling the truth about trust, fear, desire, and the deeper motives that shape what people do.",
    aliveness: "The more willing you are to be honest about intensity, the stronger this placement becomes."
  },
  Sagittarius: {
    quality: "expansive and searching",
    motion: "You are not here to accept a small explanation for your life. You learn by testing belief against experience and letting distance, study, and risk widen your perspective.",
    aliveness: "The more freedom you give yourself to explore, the more alive this placement becomes."
  },
  Capricorn: {
    quality: "disciplined and consequential",
    motion: "You are not here to treat this casually. You learn through responsibility, patience, structure, and the slow proof that comes from building something real.",
    aliveness: "The more you respect time and effort, the stronger this placement becomes."
  },
  Aquarius: {
    quality: "unconventional and future-minded",
    motion: "You are not here to inherit the usual answer without questioning it. You learn by studying systems, noticing patterns, and staying open to possibilities that challenge the status quo.",
    aliveness: "The more freedom you give yourself to think beyond the accepted path, the more alive this placement becomes."
  },
  Pisces: {
    quality: "sensitive and imaginative",
    motion: "You are not here to limit reality to what can be explained cleanly. You learn through subtle perception, creativity, compassion, and the wisdom of porous edges.",
    aliveness: "The more clearly you hold your sensitivity, the stronger this placement becomes."
  }
};

const natalSignTonePhrases: Record<string, string> = {
  Aries: "begin, act directly, and let motion reveal what thought alone cannot",
  Taurus: "move slowly enough to trust what is real, valuable, and worth protecting",
  Gemini: "ask better questions, make connections, and let new information change the picture",
  Cancer: "listen to memory, belonging, care, and the instinct to protect what matters",
  Leo: "let warmth, creativity, and personal meaning become visible",
  Virgo: "refine the pattern, improve what is workable, and turn care into something useful",
  Libra: "read contrast, choose consciously, and notice what makes exchange feel honest",
  Scorpio: "go beneath the surface and tell the truth about trust, fear, desire, and motive",
  Sagittarius: "test belief against experience and let distance, study, and risk widen perspective",
  Capricorn: "respect time, effort, consequence, and the slow proof of building something real",
  Aquarius: "question inherited answers, study systems, and stay open to possibilities outside the accepted path",
  Pisces: "follow subtle perception, imagination, compassion, and the wisdom of porous edges"
};

const natalRulerHouseLinks: Record<number, string> = {
  1: "identity, body, and the way you meet life directly",
  2: "money, self-worth, and the resources that help you feel secure",
  3: "language, learning, siblings, and your immediate environment",
  4: "home, family, emotional security, and the private structures that support your life",
  5: "creativity, romance, children, pleasure, and the courage to be seen",
  6: "work, health, daily routines, and the habits that keep life functioning",
  7: "partnership, agreement, attraction, and the people who meet you face to face",
  8: "trust, shared resources, intimacy, and the deeper material people often avoid",
  9: "belief, study, travel, wisdom, and the search for a wider truth",
  10: "career, reputation, authority, and the public shape of your life",
  11: "friends, networks, community, and the future you want to help build",
  12: "solitude, hidden pressure, dreams, retreat, and what works beneath the surface"
};

const natalRulerProcessLines: Record<string, string> = {
  Sun: "The lesson often comes through visibility, confidence, and choosing from the center of yourself.",
  Moon: "The lesson often comes through emotional honesty, memory, care, and the need to feel safe enough to respond.",
  Mercury: "The lesson often comes through noticing, naming, learning, and saying what needs to be said.",
  Venus: "The lesson often comes through desire, value, attraction, and the choices that make connection feel real.",
  Mars: "The lesson often comes through acting on what your instincts already know, especially when avoidance has started to cost you energy.",
  Jupiter: "The lesson often comes through study, risk, faith, and the wider meaning you build from experience.",
  Saturn: "The lesson often comes through time, responsibility, commitment, and the evidence of lived experience.",
  Uranus: "The lesson often comes through disruption, freedom, and breaking a pattern that no longer fits.",
  Neptune: "The lesson often comes through sensitivity, imagination, longing, and the work of clarifying what is real.",
  Pluto: "The lesson often comes through pressure, honesty, endings, and the power that returns when something hidden is finally faced."
};

const natalPlacementTemplateLeakPatterns = [
  /\bthis part of the chart\b/i,
  /\bwithout losing its\b/i,
  /\bcarries the thread\b/i,
  /\bboth places\b/i,
  /\bthemes\b/i,
  /\broutes? this placement\b/i,
  /\bthe story becomes more specific\b/i,
  /\bthis placement becomes more alive\b/i
];

function possessiveArea(focus: string) {
  return focus.replace(/^your\s+/i, "");
}

function natalPlacementUseParagraph(
  position: PlanetPosition,
  houseFrame: { intro: string; focus: string; lived: string }
) {
  const focus = houseFrame.focus;

  switch (position.planet) {
    case "Sun":
      return `This placement asks you to make meaning visible through the way you live. You are not only collecting experience in ${focus}. You are looking for the kind of truth that can shape your choices, clarify your direction, and change what you contribute.`;
    case "Moon":
      return `This placement asks you to listen to what your inner life keeps registering. You may not always have an immediate explanation for what you feel, but your mood often tells you when ${focus} needs care, honesty, or a different rhythm.`;
    case "Mercury":
      return `This placement asks you to turn observation into understanding. You may be able to make complex material easier to name, especially when ${focus} keeps presenting the same question in different forms.`;
    case "Venus":
      return `This placement asks you to notice what you keep choosing and why. Pleasure, attraction, and ease are not side notes here. They show you what ${focus} needs in order to feel honest, mutual, and worth protecting.`;
    case "Mars":
      return `This placement asks you to act on what matters instead of waiting until every feeling is settled. Conflict, desire, and momentum can clarify ${focus}, especially when avoidance has started to cost you energy.`;
    case "Jupiter":
      return `This placement asks you to follow what expands your life without losing contact with judgment. You may be drawn toward teachers, chances, risks, or experiences that make ${focus} feel larger than it was before.`;
    case "Saturn":
      return `This placement asks you to build trust through repetition. Pressure in ${focus} is not always a sign that something is wrong. Sometimes it shows where skill, patience, and inner authority are trying to form.`;
    case "Uranus":
      return `This placement asks you to notice where the old arrangement has become too small. Change may come through disruption, but the deeper point is honesty: ${focus} needs enough freedom to keep becoming true.`;
    case "Neptune":
      return `This placement asks you to protect your sensitivity without disappearing into it. Imagination can open ${focus}, but clarity matters too, especially when hope, longing, or projection starts to blur the next step.`;
    case "Pluto":
      return `This placement asks you to tell the truth about what has power over you. ${focus} can become a place of deep renewal when you stop trying to control the pressure and begin listening to what it is exposing.`;
    default:
      return `This placement asks you to pay attention to what becomes clearer through ${focus}.`;
  }
}

function natalRulerParagraph({
  cuspSign,
  houseFrame,
  houseLabel,
  houseRuler,
  rulerHouse,
  rulerPosition
}: {
  cuspSign: string;
  houseFrame: { intro: string; focus: string; lived: string };
  houseLabel: string;
  houseRuler: string;
  rulerHouse: number | null;
  rulerPosition: PlanetPosition | null;
}) {
  const focus = houseFrame.focus;

  if (houseRuler && rulerPosition && rulerHouse) {
    const rulerHouseLink = natalRulerHouseLinks[rulerHouse] ?? readableHouseTopic(rulerHouse);
    const rulerProcess = natalRulerProcessLines[houseRuler] ?? `Its placement shows where the lesson becomes concrete.`;

    return `Because ${cuspSign} starts your ${houseLabel}, ${houseRuler} rules this area of your chart. ${rulerProcess} In your birth chart, ${houseRuler} is in ${rulerPosition.sign} in the ${ordinalHouse(rulerHouse)} house, so ${focus} connects back to ${rulerHouseLink}. Over time, the meaning of this placement becomes clearer when those areas of life are allowed to speak to each other.`;
  }

  if (houseRuler) {
    const rulerProcess = natalRulerProcessLines[houseRuler] ?? `Its placement shows where the lesson becomes concrete.`;

    return `Because ${cuspSign} starts your ${houseLabel}, ${houseRuler} rules this area of your chart. ${rulerProcess} Its natal placement shows where the meaning becomes more personal, practical, and specific over time.`;
  }

  return `The ruler of your ${houseLabel} shows where this area of life becomes more personal, practical, and specific over time.`;
}

function natalPlacementSynthesisParagraph(
  position: PlanetPosition,
  houseFrame: { intro: string; focus: string; lived: string },
  planetFrame: { house: string; growth: string; integration: string }
) {
  const focus = possessiveArea(houseFrame.focus);

  switch (position.planet) {
    case "Sun":
      return `Over time, your sense of purpose becomes stronger when your ${focus} is tested against real life. The version of confidence that lasts is the one that helps you feel more honest, more rooted, and more willing to act from the center of yourself. Your path is not only about knowing who you are. It is about building a life that can hold that truth.`;
    case "Moon":
      return `Over time, your emotional steadiness grows when your ${focus} gives your needs somewhere real to land. You are learning to trust what your body and mood are telling you before they have to become louder. The more this area of life supports honest care, the easier it becomes to respond instead of defend.`;
    case "Mercury":
      return `Over time, your thinking becomes clearer when your ${focus} gives your mind something real to work with. You are learning how to turn perception into language and language into movement. The strongest version of this placement does not just notice the pattern. It says what is true clearly enough to change what happens next.`;
    case "Venus":
      return `Over time, your sense of value becomes steadier when your ${focus} reflects what actually feels worth choosing. You are learning the difference between what attracts you quickly and what continues to feel good after the first pull passes. The more honest your choices become here, the more connection can feel both alive and sustainable.`;
    case "Mars":
      return `Over time, your courage becomes more useful when your ${focus} gives your drive a worthy direction. You are learning how to act on desire without burning through your own stability. The strongest version of this placement does not just push, fight, or react. It moves with purpose because the target actually matters.`;
    case "Jupiter":
      return `Over time, your confidence grows when your ${focus} gives your faith something real to stand on. You are learning how to recognize opportunity without turning every open door into an obligation. The wisdom here comes from letting experience expand you while still asking what is true, useful, and worth carrying forward.`;
    case "Saturn":
      return `Over time, your authority becomes stronger when your ${focus} is built through choices that can hold weight. You are learning that limits do not have to mean punishment. They can become the structure that lets trust, skill, and maturity develop into something reliable.`;
    case "Uranus":
      return `Over time, your freedom becomes more livable when your ${focus} can change without becoming ungrounded. You are learning which patterns need to break and which ones are still strong enough to support you. The point is not disruption for its own sake. It is a more honest way to live.`;
    case "Neptune":
      return `Over time, your imagination becomes more trustworthy when your ${focus} can hold both sensitivity and clarity. You are learning how to let longing, compassion, and inspiration matter without giving them permission to blur everything. The dream gets stronger when it can survive contact with real life.`;
    case "Pluto":
      return `Over time, your power becomes cleaner when your ${focus} is built on truth instead of control. You are learning where pressure is asking for honesty, not more defense. What changes you here can become strength, but only after you stop protecting the version of life that is already asking to transform.`;
    default:
      return `Over time, ${planetFrame.growth} becomes steadier when your ${focus} reflects what is actually true for you. ${planetFrame.integration}.`;
  }
}

function hasNatalPlacementTemplateLeak(paragraph: string) {
  return natalPlacementTemplateLeakPatterns.some((pattern) => pattern.test(paragraph));
}

function cleanNatalPlacementLensParagraphs({
  fallbackParagraphs,
  rebuiltRulerParagraph,
  rebuiltSynthesisParagraph
}: {
  fallbackParagraphs: string[];
  rebuiltRulerParagraph: string;
  rebuiltSynthesisParagraph: string;
}) {
  return fallbackParagraphs.map((paragraph, index) => {
    if (index === 2 && hasNatalPlacementTemplateLeak(paragraph)) {
      return rebuiltRulerParagraph;
    }

    if (index === 3 && hasNatalPlacementTemplateLeak(paragraph)) {
      return rebuiltSynthesisParagraph;
    }

    return paragraph
      .replace(/\s+/g, " ")
      .replace(/\bthis part of the chart\b/gi, "this area of life")
      .replace(/\bboth places\b/gi, "the two areas of life")
      .trim();
  });
}

function approvedNatalPlacementBody(position: PlanetPosition) {
  if (position.planet === "Sun" && position.sign === "Aquarius" && position.house === 9) {
    return [
      "Your identity grows through the search for meaning. You are not here to accept a worldview just because it was handed to you. With your Sun in Aquarius in the 9th house, you discover who you are by questioning inherited beliefs, studying systems, exploring different perspectives, and testing ideas against lived experience.",
      "There is a future-minded quality to this placement. You may be drawn to philosophy, spirituality, education, travel, social issues, or any field that helps you understand people and the world from a wider angle. You are not only collecting knowledge. You are looking for the kind of truth that can change how you live and what you contribute.",
      "This placement also has a teaching quality. You may be able to take complex ideas and make them clearer for other people, especially when those ideas challenge old assumptions or open a new way forward. Your growth comes from staying curious, thinking independently, and letting your beliefs evolve as your experience deepens.",
      "The strongest version of this placement is not detached from real life. It asks you to bring your ideas back down to earth. What you believe has to become something you can live, share, and build from. Over time, your sense of purpose becomes clearer when your originality serves something larger than yourself."
    ].join("\n\n");
  }

  return "";
}

function natalPlacementFallbackSection(
  position: PlanetPosition,
  natalSky: SkySnapshot | null,
  options: { includeApprovedBody?: boolean } = {}
): YouTransitArticle["sections"][number] | null {
  if (!position.house) {
    return null;
  }

  const approvedBody = approvedNatalPlacementBody(position);

  if (approvedBody && options.includeApprovedBody !== false) {
    return {
      heading: natalPlacementFullTitle(position),
      tldr: "",
      body: approvedBody
    };
  }

  const house = position.house;
  const houseLabel = `${ordinalHouse(house)} house`;
  const houseFrame = natalHouseFallbackFrames[house];
  const planetFrame = natalPlanetFallbackFrames[position.planet] ?? natalPlanetFallbackFrames.Sun;
  const signFrame = natalSignFallbackFrames[position.sign] ?? natalSignFallbackFrames.Aries;
  const cuspSign = natalSky?.ascendant ? signAtWholeSignHouse(natalSky.ascendant, house) : position.sign;
  const houseRuler = traditionalSignRulers[cuspSign] ?? "";
  const rulerPosition = houseRuler
    ? natalSky?.positions.find((candidate) => candidate.planet === houseRuler) ?? null
    : null;
  const rulerHouse = rulerPosition?.house ?? null;

  const houseParagraph = natalPlanetHouseParagraph(position, houseFrame, houseLabel);
  const signParagraph = natalPlanetSignParagraph(position, signFrame);
  const rulerParagraph = natalRulerParagraph({
    cuspSign,
    houseFrame,
    houseLabel,
    houseRuler,
    rulerHouse,
    rulerPosition
  });
  const integrationParagraph = natalPlacementSynthesisParagraph(position, houseFrame, planetFrame);
  const useParagraph = natalPlacementUseParagraph(position, houseFrame);
  const paragraphs = cleanNatalPlacementLensParagraphs({
    fallbackParagraphs: [houseParagraph, signParagraph, useParagraph, rulerParagraph || integrationParagraph],
    rebuiltRulerParagraph: rulerParagraph,
    rebuiltSynthesisParagraph: integrationParagraph
  });
  const body = paragraphs.join("\n\n");

  return {
    heading: natalPlacementFullTitle(position),
    tldr: "",
    body
  };
}

function natalPlacementSignTitle(position: PlanetPosition) {
  return placementTitleFromParts(position.planet, position.sign, position.motion === "retrograde");
}

function placementTitleFromParts(planet: string, sign: string, retrograde = false) {
  return `${planet}${retrograde ? " Rx" : ""} in ${sign}`;
}

function natalPlacementFullTitle(position: PlanetPosition) {
  const baseTitle = placementTitleFromParts(position.planet, position.sign, position.motion === "retrograde");

  return position.house ? `${baseTitle} in the ${ordinalHouse(position.house)} house` : baseTitle;
}

function natalPlacementMeta(position: PlanetPosition) {
  return `${ordinalHouse(position.house)} House · ${formatPlanetDegree(position)}`;
}

function natalPlacementDescription(planet: string) {
  return natalSignatureDescriptions[planet] ?? "";
}

function natalPlacementKnowledgeSummary(position: PlanetPosition, generatedContent?: GeneratedContentMap) {
  const content = fallbackFromHook(
    "you.natal-placement",
    {
      planet: position.planet,
      sign: position.sign,
      house: position.house
    },
    {
      summary: natalPlacementDescription(position.planet)
    }
  );
  const generated = generatedContent ? liveGeneratedContent(generatedContent, placementContentId(position.planet, position.sign)) : null;

  return liveGeneratedSummary(generated, content.summary);
}

function natalPlacementRouteId(position: PlanetPosition) {
  return [
    normalizeContentIdPart(position.planet),
    normalizeContentIdPart(position.sign),
    position.house ? `${position.house}h` : "house-pending"
  ].join("-");
}

function natalPlacementWriteupContentKey(position: PlanetPosition) {
  return `you-natal-placement-v1-${natalPlacementRouteId(position)}`;
}

function natalPlacementWriteupSubjectId(chartId: string | undefined) {
  return chartId || "local-chart";
}

function natalPlacementDetailTitle(position: PlanetPosition) {
  return natalPlacementFullTitle(position);
}

function natalPlacementDetailSubtitle(position: PlanetPosition) {
  const parts = [formatPlanetDegree(position)];
  const dignity = placementDignity(position);

  if (dignity) {
    parts.push(dignity.label);
  }

  return parts.join(" · ");
}

const natalPlacementLensHint = "The planet shows the part of you being activated. The house shows where that energy becomes part of your lived experience. The sign on the house shows the pattern it moves through, and the ruler of that sign shows where the meaning keeps unfolding over time. This lens shows the architecture underneath the interpretation: what part of you is involved, where it becomes active, how it expresses itself, and where it keeps developing over time.";

function isNatalPlacementLensWriteup(writeup: LiveGeneratedContent | null) {
  return writeup?.provider === "deterministic" || writeup?.model === "placement-ruler-template-v1";
}

function natalPlacementDetailArticle(
  position: PlanetPosition,
  natalSky: SkySnapshot | null,
  liveWriteup: LiveGeneratedContent | null,
  generatedContent: GeneratedContentMap = new Map(),
  onOpenNatalAspect?: (aspect: SkySnapshot["aspects"][number]) => void,
  ownerContext?: { ownerName: string; ownerKind?: "person" | "chart" }
): YouTransitArticle {
  const bodyParagraphs = generatedContentParagraphs(liveWriteup);
  const liveBody = bodyParagraphs.join("\n\n").trim();
  const approvedBody = approvedNatalPlacementBody(position);
  const hasApprovedBody = Boolean(approvedBody);
  const hasLiveAuthoredBody = Boolean(liveBody && !isNatalPlacementLensWriteup(liveWriteup));
  const hasAuthoredBody = hasApprovedBody || hasLiveAuthoredBody;
  const fallbackSection = hasAuthoredBody
    ? null
    : natalPlacementFallbackSection(position, natalSky, {
      includeApprovedBody: true
    });
  const authoredBodyParagraphs = hasApprovedBody
    ? approvedBody.split(/\n\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
    : hasLiveAuthoredBody
      ? bodyParagraphs
      : [];
  const lensBody = fallbackSection?.body ?? (isNatalPlacementLensWriteup(liveWriteup) ? liveBody : "");
  const sections = lensBody
    ? [{
      heading: "",
      tldr: "",
      body: lensBody
    }]
    : [];
  const relatedAspectRows = relatedAspectRowsForPlacement({
    aspects: natalSky?.aspects ?? [],
    generatedContent,
    mode: "natal",
    onOpenNatalAspect,
    ownerContext,
    pointName: position.planet
  });

  return {
    id: natalPlacementRouteId(position),
    title: natalPlacementDetailTitle(position),
    glyph: position.glyph || pointGlyph(position.planet),
    subtitle: natalPlacementDetailSubtitle(position),
    lensHint: natalPlacementLensHint,
    compactHeader: true,
    plainBody: authoredBodyParagraphs.length > 0,
    bodyBeforeSections: true,
    body: authoredBodyParagraphs,
    summary: "",
    summaryHeading: "",
    sections,
    relatedAspects: relatedAspectRows.length > 0
      ? {
          heading: `Natal aspects to ${position.planet}`,
          rows: relatedAspectRows
        }
      : undefined,
    meta: [
      { label: "Placement", value: natalPlacementDetailTitle(position) },
      { label: "House", value: position.house ? `${ordinalHouse(position.house)} House` : "" },
      { label: "Degree", value: formatPlanetDegree(position) },
      { label: "Status", value: placementDignity(position)?.label ?? "" }
    ]
  };
}

function natalPlacementSkyDetail(
  position: PlanetPosition,
  natalSky: SkySnapshot | null,
  liveWriteup: LiveGeneratedContent | null,
  generatedContent: GeneratedContentMap = new Map(),
  onOpenNatalAspect?: (aspect: SkySnapshot["aspects"][number]) => void,
  ownerContext?: { ownerName: string; ownerKind?: "person" | "chart" }
): SkyDetail {
  const article = natalPlacementDetailArticle(position, natalSky, liveWriteup, generatedContent, onOpenNatalAspect, ownerContext);
  const ownerAwareCopy = (value: ReactNode) => {
    if (!ownerContext || typeof value !== "string") {
      return value;
    }

    return natalGeneratedCopyForOwner(value, ownerContext.ownerName, ownerContext.ownerKind ?? "person");
  };

  return {
    glyph: article.glyph || pointGlyph(position.planet),
    kicker: "Natal placement",
    title: ownerContext?.ownerKind === "person" ? `${possessiveLabel(ownerContext.ownerName)} ${article.title}` : article.title,
    meta: article.subtitle,
    subtitle: article.subtitle,
    lensHint: ownerAwareCopy(article.lensHint),
    compactHeader: article.compactHeader,
    plainBody: article.plainBody,
    bodyBeforeSections: article.bodyBeforeSections,
    retrograde: position.motion === "retrograde",
    body: (article.body ?? []).map(ownerAwareCopy),
    sections: article.sections.map((section) => ({
      heading: section.heading,
      body: ownerAwareCopy(section.body)
    })),
    relatedAspects: article.relatedAspects
  };
}

function natalRisingKnowledgeSummary(risingSign: string, generatedContent?: GeneratedContentMap) {
  const content = approvedVoiceOrKnowledgeFallback(placementContentId("Ascendant", risingSign));
  const generated = generatedContent ? liveGeneratedContent(generatedContent, placementContentId("Ascendant", risingSign)) : null;

  return liveGeneratedSummary(generated, content.summary);
}

const signElementMap: Record<string, "Fire" | "Earth" | "Air" | "Water"> = {
  Aries: "Fire",
  Leo: "Fire",
  Sagittarius: "Fire",
  Taurus: "Earth",
  Virgo: "Earth",
  Capricorn: "Earth",
  Gemini: "Air",
  Libra: "Air",
  Aquarius: "Air",
  Cancer: "Water",
  Scorpio: "Water",
  Pisces: "Water"
};

function natalElementBalance(positions: PlanetPosition[]) {
  const counts = { Fire: 0, Earth: 0, Air: 0, Water: 0 };

  positions.forEach((position) => {
    const element = signElementMap[position.sign];

    if (element) {
      counts[element] += 1;
    }
  });

  return (["Fire", "Earth", "Air", "Water"] as const).map((element) => ({
    element,
    count: counts[element]
  }));
}

function elementalBalanceSummary(balance: ReturnType<typeof natalElementBalance>) {
  const ranked = [...balance].sort((first, second) => second.count - first.count);
  const [leader, runnerUp] = ranked;
  const activeElements = ranked.filter((item) => item.count > 0);
  const topElements = activeElements.filter((item) => item.count === leader?.count);
  const quietElements = ranked.filter((item) => item.count === 0).map((item) => item.element);
  const clearLead = Boolean(leader && leader.count > 0 && leader.count >= (runnerUp?.count ?? 0) + 2);

  if (!leader || leader.count === 0) {
    return {
      label: "Balance still forming",
      sentence: "Elemental balance will appear once the chart has placements.",
      leadElement: null as null | "Fire" | "Earth" | "Air" | "Water",
      hasClearLead: false
    };
  }

  if (clearLead) {
    return {
      label: `${leader.element} led`,
      sentence: `${leader.element} is the clearest emphasis in this chart.`,
      leadElement: leader.element,
      hasClearLead: true
    };
  }

  if (topElements.length === 1) {
    return {
      label: "Mixed emphasis",
      sentence: `${topElements[0].element} is slightly emphasized, but the chart is broadly mixed.`,
      leadElement: null,
      hasClearLead: false
    };
  }

  if (topElements.length < 4) {
    const topLabel = readableNameList(topElements.map((item) => item.element));
    const quietLabel = quietElements.length > 0 ? `${readableNameList(quietElements)} ${quietElements.length === 1 ? "is" : "are"} quieter.` : "No element is especially quiet.";

    return {
      label: "Mixed emphasis",
      sentence: `${topLabel} ${topElements.length === 1 ? "is" : "are"} evenly emphasized. ${quietLabel}`,
      leadElement: null,
      hasClearLead: false
    };
  }

  return {
    label: "No single element leads",
    sentence: "Fire, Earth, Air, and Water are evenly distributed.",
    leadElement: null,
    hasClearLead: false
  };
}

function relationshipPossessiveName(name: string, isSelf = false) {
  if (isSelf) {
    return "Your";
  }

  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

function MoonPhaseArt({ phase }: { phase: string }) {
  const phaseClass = phase.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return <span className={`moon-phase-art moon-phase-art--${phaseClass || "default"}`} aria-hidden="true" />;
}

type RetrogradeWindow = {
  planet: string;
  preShadowStart?: string;
  retrogradeStart: string;
  retrogradeEnd: string;
  postShadowEnd?: string;
  shadows?: "standard" | "not-applicable";
};

const retrogradeWindows: RetrogradeWindow[] = [
  {
    planet: "Jupiter",
    preShadowStart: "2025-08-17",
    retrogradeStart: "2025-11-11",
    retrogradeEnd: "2026-03-11",
    postShadowEnd: "2026-06-06"
  },
  {
    planet: "Pluto",
    preShadowStart: "2026-01-12",
    retrogradeStart: "2026-05-06",
    retrogradeEnd: "2026-10-16",
    postShadowEnd: "2027-02-07"
  },
  {
    planet: "North Node",
    retrogradeStart: "2026-05-11",
    retrogradeEnd: "2026-06-07",
    shadows: "not-applicable"
  },
  {
    planet: "North Node",
    retrogradeStart: "2026-06-08",
    retrogradeEnd: "2026-06-19",
    shadows: "not-applicable"
  },
  {
    planet: "Saturn",
    preShadowStart: "2026-04-20",
    retrogradeStart: "2026-07-26",
    retrogradeEnd: "2026-12-10",
    postShadowEnd: "2027-03-15"
  },
  {
    planet: "Uranus",
    preShadowStart: "2026-05-25",
    retrogradeStart: "2026-09-10",
    retrogradeEnd: "2027-02-08",
    postShadowEnd: "2027-05-26"
  },
  {
    planet: "Neptune",
    preShadowStart: "2026-03-16",
    retrogradeStart: "2026-07-07",
    retrogradeEnd: "2026-12-12",
    postShadowEnd: "2027-04-02"
  },
  {
    planet: "Jupiter",
    preShadowStart: "2026-09-17",
    retrogradeStart: "2026-12-13",
    retrogradeEnd: "2027-04-13",
    postShadowEnd: "2027-07-11"
  }
];

function dateOnly(value: string | Date) {
  const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : value;

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function formatRetrogradeDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

function formatRetrogradeDateRange(start: string, end: string) {
  return `${formatRetrogradeDate(start)} - ${formatRetrogradeDate(end)}`;
}

function formatRetrogradeEndDate(retrogradeEndDate?: string) {
  return retrogradeEndDate ? `Until ${formatRetrogradeDate(retrogradeEndDate)}` : "Dates calculating";
}

function formatRetrogradeDuration(retrogradeStartDate?: string, retrogradeEndDate?: string) {
  if (!retrogradeStartDate || !retrogradeEndDate) {
    return null;
  }

  const duration = formatDurationCompact(retrogradeStartDate, retrogradeEndDate);

  return duration ? `${duration} Rx` : null;
}

const personalRetrogradePlanets = new Set(["Mercury", "Venus", "Mars"]);

function isPersonalRetrogradePlanet(planet: string) {
  return personalRetrogradePlanets.has(planet);
}

function formatRetrogradeCountChip(retrogradeStartDate?: string, retrogradeEndDate?: string) {
  if (!retrogradeStartDate || !retrogradeEndDate) {
    return null;
  }

  const duration = getDurationParts(retrogradeStartDate, retrogradeEndDate);

  if (!duration) {
    return null;
  }

  if (duration.days < 1) {
    return "TODAY";
  }

  if (duration.days < 30) {
    return `${duration.days}D`;
  }

  if (duration.days < 84) {
    return `${Math.max(1, Math.round(duration.days / 7))}W`;
  }

  if (duration.months < 12) {
    return `${duration.months}M`;
  }

  return duration.remainingMonths > 0
    ? `${duration.years}Y ${duration.remainingMonths}M`
    : `${duration.years}Y`;
}

function joinRetrogradeNames(names: string[]) {
  if (names.length <= 1) {
    return names[0] ?? "";
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function retrogradeSummaryCaption(personal: PlanetPosition[], outer: PlanetPosition[]) {
  if (personal.length > 0 && outer.length > 0) {
    const personalNames = joinRetrogradeNames(personal.map((position) => position.planet));
    const singular = personal.length === 1;

    return `${personalNames} ${singular ? "is" : "are"} the ${singular ? "one" : "ones"} you may feel most in daily life. The slower retrogrades work in the background, helping you revisit old patterns, notice what is no longer working, and make adjustments over time.`;
  }

  if (personal.length > 0) {
    const personalNames = joinRetrogradeNames(personal.map((position) => position.planet));

    return `${personalNames} ${personal.length === 1 ? "is" : "are"} retrograde among your faster, daily-felt planets - expect plans, feelings, and timing to ask for a second pass.`;
  }

  return "These are all slow outer-planet retrogrades. They work quietly in the background, helping you revisit old patterns and make adjustments over the months ahead.";
}

function retrogradePlacementTitle(position: PlanetPosition) {
  return `${skyDisplayPlanetName(position.planet)} Rx in ${position.sign}`;
}

function retrogradeRangeText(window?: RetrogradeWindow) {
  if (!window) {
    return "Dates calculating";
  }

  return formatRetrogradeDateRange(window.retrogradeStart, window.retrogradeEnd);
}

function formatSignChapter(sign: string, signTransitEndDate?: string | null) {
  return signTransitEndDate ? `${sign} chapter until ${formatRetrogradeDate(signTransitEndDate)}` : null;
}

function retrogradeWindowFor(position: PlanetPosition, generatedAt: string) {
  const currentDay = dateOnly(generatedAt);
  const lookupPlanet = position.planet === "South Node" || position.planet === "True Node"
    ? "North Node"
    : position.planet;

  return retrogradeWindows.find((window) => {
    if (window.planet !== lookupPlanet) {
      return false;
    }

    return currentDay >= dateOnly(window.retrogradeStart) && currentDay <= dateOnly(window.retrogradeEnd);
  }) ?? retrogradeWindows.find((window) => window.planet === lookupPlanet);
}

function activeRetrogradeWindowForPlanet(planet: string, generatedAt: string) {
  const currentDay = dateOnly(generatedAt);
  const lookupPlanet = planet === "South Node" || planet === "True Node" ? "North Node" : planet;

  return retrogradeWindows.find((window) => (
    window.planet === lookupPlanet
    && currentDay >= dateOnly(window.retrogradeStart)
    && currentDay <= dateOnly(window.retrogradeEnd)
  ));
}

function activeRetrogradePositions(positions: PlanetPosition[], generatedAt: string) {
  return positions
    .filter((position) => position.motion === "retrograde" || activeRetrogradeWindowForPlanet(position.planet, generatedAt))
    .map((position) => activeRetrogradeWindowForPlanet(position.planet, generatedAt)
      ? { ...position, motion: "retrograde" as const }
      : position);
}

function retrogradeTimelineLines(window?: RetrogradeWindow) {
  if (!window) {
    return ["Retrograde dates are being calculated for this cycle."];
  }

  if (window.shadows === "not-applicable") {
    return [
      `Retrograde: ${formatRetrogradeDateRange(window.retrogradeStart, window.retrogradeEnd)}`,
      "Pre-shadow: not used for lunar nodes",
      "Post-shadow: not used for lunar nodes"
    ];
  }

  return [
    `Pre-shadow: ${window.preShadowStart ? formatRetrogradeDate(window.preShadowStart) : "not available"}`,
    `Retrograde: ${formatRetrogradeDateRange(window.retrogradeStart, window.retrogradeEnd)}`,
    `Post-shadow: ${window.postShadowEnd ? formatRetrogradeDate(window.postShadowEnd) : "not available"}`
  ];
}

function retrogradeCardRange(window?: RetrogradeWindow) {
  if (!window) {
    return "Dates calculating";
  }

  return formatRetrogradeEndDate(window.retrogradeEnd);
}

function retrogradeDetailRange(window?: RetrogradeWindow) {
  if (!window) {
    return "Dates calculating";
  }

  return formatRetrogradeDateRange(window.retrogradeStart, window.retrogradeEnd);
}

function signChapterEndLabel(position: PlanetPosition) {
  return formatSignChapter(position.sign, position.transitEnd);
}

function compactRetrogradeTiming(position: PlanetPosition, window?: RetrogradeWindow) {
  return window ? retrogradeDetailRange(window) : "Dates calculating";
}

function SkyCards({ sky }: { sky: SkySnapshot }) {
  const sun = sky.positions.find((position) => position.planet === "Sun");
  const moon = sky.positions.find((position) => position.planet === "Moon");
  const sunDegree = formatBriefPlacementDegree(sun);
  const moonDegree = formatBriefPlacementDegree(moon);
  const sunSignLabel = compactSkyChicletSign(sun?.sign ?? "Current");
  const moonSignLabel = compactSkyChicletSign(sky.moonStatus?.label ?? moon?.sign ?? "Current");
  const shouldShowMoonDegree = sky.moonStatus?.kind !== "void";

  return (
    <section className="sky-lunar-brief" aria-label="Sky highlights">
      <div className="sky-lunar-pills" aria-label="Current Sun and Moon phase">
        <span className="sky-lunar-pill">
          <span className="sky-lunar-pill-icon" aria-hidden="true">☉</span>
          <span className="sky-lunar-pill-copy">
            <em>Sun</em>
            <h3>
              <span>{sunSignLabel}</span>
              {sunDegree && <small>{sunDegree}</small>}
            </h3>
          </span>
        </span>
        <span className="sky-lunar-pill sky-lunar-pill--moon">
          <span className="sky-lunar-pill-icon sky-lunar-pill-phase" aria-hidden="true">
            <MoonPhaseArt phase={sky.moonPhase} />
          </span>
          <span className="sky-lunar-pill-copy">
            <em>Moon</em>
            <h3>
              <span>{moonSignLabel}</span>
              {moonDegree && shouldShowMoonDegree && <small>{moonDegree}</small>}
            </h3>
            <small className="sky-lunar-pill-sub">{sky.moonPhase}</small>
          </span>
        </span>
      </div>
      <NextLunationChicklet sky={sky} />
    </section>
  );
}

function NextLunationChicklet({ sky }: { sky: SkySnapshot }) {
  const event = nextMoonEvent(sky);
  const exactAt = event?.occursAt;
  const selectedDate = new Date(sky.generatedAt);
  const glyph = zodiacGlyphText(event?.sign ?? "");

  if (!event || !exactAt || Number.isNaN(exactAt.getTime()) || Number.isNaN(selectedDate.getTime()) || !glyph) {
    return null;
  }

  const title = `${event.name} in ${event.sign}`;
  const dateTimeLabel = formatLunationDateTime(exactAt);
  const countdownLabel = lunationCountdownLabel(selectedDate, exactAt);

  return (
    <div
      className="next-lun"
      role="group"
      aria-label={`${title}, ${countdownLabel.toLowerCase()}, ${dateTimeLabel}`}
    >
      <span className="nl-badge" aria-hidden="true">
        <span className="g">{glyph}</span>
      </span>

      <div className="nl-main">
        <div className="nl-top">
          <h4>
            <span>{title}</span>
          </h4>
          <span className="nl-until">{countdownLabel}</span>
        </div>
        <span className="nl-sub" data-when={exactAt.toISOString()}>
          {dateTimeLabel}
        </span>
      </div>
    </div>
  );
}

function RetrogradeCallout({
  positions,
  generatedAt,
  generatedContent,
  onOpenDetail
}: {
  positions: PlanetPosition[];
  generatedAt: string;
  generatedContent: GeneratedContentMap;
  onOpenDetail: (detail: SkyDetail) => void;
}) {
  const retrogrades = activeRetrogradePositions(positions, generatedAt);
  const [showOuterRetrogrades, setShowOuterRetrogrades] = useState(false);

  if (retrogrades.length === 0) {
    return null;
  }

  const personalRetrogrades = retrogrades.filter((position) => isPersonalRetrogradePlanet(position.planet));
  const outerRetrogrades = retrogrades.filter((position) => !isPersonalRetrogradePlanet(position.planet));
  const showSummary = retrogrades.length >= 3;
  const eyebrow = retrogrades.length === 1 ? "Retrograde" : "Retrogrades";

  const buildRetrogradeDetail = (position: PlanetPosition) => {
    const contentKey = placementContentId(position.planet, position.sign, "sky");
    const content = approvedVoiceOrKnowledgeFallback(contentKey, "sky");
    const generated = liveGeneratedContentByKeys(generatedContent, skyPlacementGeneratedContentKeys(position, generatedAt));
    const retrogradeWindow = retrogradeWindowFor(position, generatedAt);
    const durationLine = formatRetrogradeDuration(retrogradeWindow?.retrogradeStart, retrogradeWindow?.retrogradeEnd);
    const durationDescription = retrogradeWindow
      ? formatDurationLong(retrogradeWindow.retrogradeStart, retrogradeWindow.retrogradeEnd, "Retrograde")
      : null;
    const timelineLines = retrogradeTimelineLines(retrogradeWindow);
    const fallbackDetailParagraphs = [
      retrogradeKnowledgeCopy(position, generated, content),
      generated?.summary,
      content.body,
      content.summary,
      ...content.detailParagraphs
    ].filter((paragraph): paragraph is string => Boolean(paragraph?.trim()));
    const detailParagraphs = [
      ...timelineLines.map((line) => <span className="retrograde-detail-line" key={line}>{line}</span>),
      ...(durationLine
        ? [
            <span className="retrograde-detail-line retrograde-detail-meta" key={`${position.planet}-retrograde-duration`}>
              <span className="retro-pill retro-pill--countdown" aria-label={durationDescription ?? durationLine}>{durationLine}</span>
            </span>
          ]
        : []),
      ...liveGeneratedBody(generated, fallbackDetailParagraphs)
    ];

    return {
      blurb: retrogradeKnowledgeCopy(position, generated, content),
      count: formatRetrogradeDuration(retrogradeWindow?.retrogradeStart, retrogradeWindow?.retrogradeEnd),
      detail: {
        glyph: `${position.glyph} ℞`,
        kicker: retrogradeDetailKicker(position),
        title: retrogradePlacementTitle(position),
        meta: `${formatPlacementPosition(position).toUpperCase()} · ${compactRetrogradeTiming(position, retrogradeWindow)}`,
        retrograde: true,
        body: detailParagraphs,
        sections: generatedDetailSections(generated),
        astrologyDrilldown: generatedAstrologyDrilldown(generated),
        content: content.bundle
      } satisfies SkyDetail,
      range: retrogradeRangeText(retrogradeWindow)
    };
  };

  function RetrogradePlacementRow({
    position,
    compact = false
  }: {
    position: PlanetPosition;
    compact?: boolean;
  }) {
    const row = buildRetrogradeDetail(position);

    return (
      <button
        className={`sky-pl ro-sky-pl${compact ? " ro-sky-pl--compact" : ""}`}
        type="button"
        aria-label={`Read more about ${retrogradePlacementTitle(position)}`}
        onClick={() => onOpenDetail(row.detail)}
      >
        <PlacementGlyphIcon
          className="sky-pl-glyph"
          fallback={position.glyph}
          pointName={position.planet}
          retrograde={position.motion === "retrograde"}
        />
        <span className="sky-pl-body">
          <span className="sky-pl-main">
            <span className="sky-pl-title">
              <span className="ro-sky-pl__name">
                {skyDisplayPlanetName(position.planet)} <span className="sky-pl-rx">Rx</span> in {position.sign}
              </span>
              <span className="sky-pl-degree">{formatPlanetDegree(position)}</span>
              {row.count ? <span className="spl-status-item spl-status-retrograde">{row.count}</span> : null}
            </span>
          </span>
          <span className="sky-pl-range">
            <span>{row.range}</span>
          </span>
          {!compact ? <span className="ro-sky-pl__blurb">{row.blurb}</span> : null}
        </span>
      </button>
    );
  }

  return (
    <section className={`retrograde-section chart-section ro-screen${showSummary ? " ro-screen--summary" : ""}`} aria-label="Retrograde planets">
      <span className="section-label">{eyebrow}</span>

      {showSummary ? (
        <div className="ro-sum">
          <div className="ro-sum-head">
            <div>
              <div className="ro-sum-n">{retrogrades.length}</div>
              <div className="ro-sum-label">planets retrograde</div>
            </div>
            <div className="ro-cluster" aria-hidden="true">
              {retrogrades.map((position) => (
                <PlacementGlyphIcon
                  className="ro-cluster-badge"
                  fallback={position.glyph}
                  key={`cluster-${position.planet}`}
                  pointName={position.planet}
                  retrograde={position.motion === "retrograde"}
                />
              ))}
            </div>
          </div>
          <p className="ro-sum-cap">{retrogradeSummaryCaption(personalRetrogrades, outerRetrogrades)}</p>
        </div>
      ) : null}

      {!showSummary ? (
        <div className="ro-rows">
          {retrogrades.map((position) => (
            <div className="sky-pl-item" key={position.planet}>
              <RetrogradePlacementRow position={position} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {personalRetrogrades.length > 0 ? (
            <div className="ro-group">
              <span className="ro-group-label">Felt now</span>
              <div className="ro-rows">
                {personalRetrogrades.map((position) => (
                  <div className="sky-pl-item" key={position.planet}>
                    <RetrogradePlacementRow position={position} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {outerRetrogrades.length > 0 ? (
            <div className="ro-group">
              <button
                className="ro-more"
                type="button"
                aria-expanded={showOuterRetrogrades}
                onClick={() => setShowOuterRetrogrades((current) => !current)}
              >
                <span className="ro-more-cluster" aria-hidden="true">
                  {outerRetrogrades.map((position) => (
                    <PlacementGlyphIcon
                      className="ro-more-badge"
                      fallback={position.glyph}
                      key={`outer-${position.planet}`}
                      pointName={position.planet}
                      retrograde={position.motion === "retrograde"}
                    />
                  ))}
                </span>
                <span className="ro-more-copy">
                  <span className="ro-group-label">Long-term</span>
                  <span className="ro-more-text">
                    {showOuterRetrogrades
                      ? "Show less"
                      : `Show ${outerRetrogrades.length} outer-planet retrograde${outerRetrogrades.length === 1 ? "" : "s"}`}
                  </span>
                </span>
                <ChevronRight className={`ro-more-chevron${showOuterRetrogrades ? " is-open" : ""}`} aria-hidden="true" />
              </button>

              {showOuterRetrogrades ? (
                <div className="ro-rows">
                  {outerRetrogrades.map((position) => (
                    <div className="sky-pl-item" key={position.planet}>
                      <RetrogradePlacementRow position={position} compact />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function CitySearchField({
  label,
  value,
  onChange,
  onSelect,
  placeholder,
  optional = false,
  optionalLabel = "Optional",
  icon,
  className = ""
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: CitySuggestion) => void;
  placeholder: string;
  optional?: boolean;
  optionalLabel?: string;
  icon?: ReactNode;
  className?: string;
}) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const query = value.trim();

  useEffect(() => {
    if (!isActive) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;

      if (!target || fieldRef.current?.contains(target)) {
        return;
      }

      setIsActive(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsActive(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive]);

  useEffect(() => {
    let cancelled = false;

    if (!isActive || !hasMapboxToken() || query.length < 2) {
      setSuggestions([]);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    const searchTimer = window.setTimeout(() => {
      searchCities(query)
        .then((nextSuggestions) => {
          if (cancelled) {
            return;
          }

          setSuggestions(nextSuggestions);
          setStatus(nextSuggestions.length > 0 ? "ready" : "empty");
        })
        .catch(() => {
          if (cancelled) {
            return;
          }

          setSuggestions([]);
          setStatus("error");
        });
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(searchTimer);
    };
  }, [isActive, query]);

  function chooseSuggestion(suggestion: CitySuggestion) {
    if (onSelect) {
      onSelect(suggestion);
    } else {
      onChange(suggestion.label);
    }
    setSuggestions([]);
    setStatus("idle");
    setIsActive(false);
  }

  const input = (
    <input
      aria-label={label}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
        setIsActive(true);
      }}
      onFocus={() => setIsActive(true)}
      placeholder={placeholder}
    />
  );

  return (
    <div ref={fieldRef} className={`field-line city-search-field ${className}`}>
      <label>
        <span>
          {label}
          {optional && <em>{optionalLabel}</em>}
        </span>
        {icon ? (
          <div className="city-search-control">
            {icon}
            {input}
          </div>
        ) : input}
      </label>

      {isActive && (
        <CitySuggestions
          suggestions={suggestions}
          status={status}
          mapboxEnabled={hasMapboxToken()}
          onSelect={chooseSuggestion}
        />
      )}
    </div>
  );
}

function TodayView({
  positions,
  aspects,
  generatedAt,
  generatedContent,
  lifeAreaFocus,
  onOpenDetail
}: {
  positions: PlanetPosition[];
  aspects: SkySnapshot["aspects"];
  generatedAt: string;
  generatedContent: GeneratedContentMap;
  lifeAreaFocus: LifeAreaFocus[];
  onOpenDetail: (detail: SkyDetail) => void;
}) {
  return (
    <SkyTodayView
      placements={(
        <PlacementTable
          positions={positions}
          aspects={aspects}
          generatedAt={generatedAt}
          generatedContent={generatedContent}
          lifeAreaFocus={lifeAreaFocus}
          onOpenDetail={onOpenDetail}
        />
      )}
      aspects={(
        <ActiveAspects
          aspects={aspects}
          positions={positions}
          generatedAt={generatedAt}
          generatedContent={generatedContent}
          lifeAreaFocus={lifeAreaFocus}
          onOpenDetail={onOpenDetail}
        />
      )}
    />
  );
}
function placementDetailKicker(position: PlanetPosition, activeAspects: SkySnapshot["aspects"]) {
  return "";
}

function placementDetailTitle(position: PlanetPosition, activeAspects: SkySnapshot["aspects"]) {
  const baseTitle = natalPlacementTitle(position);

  const primaryAspect = activeAspects[0];
  if (primaryAspect) {
    const otherPlanet = primaryAspect.from === position.planet ? primaryAspect.to : primaryAspect.from;
    return `${baseTitle} ${primaryAspect.type} ${otherPlanet}`;
  }

  return baseTitle;
}

function ActiveAspects({
  aspects,
  positions,
  generatedAt,
  generatedContent,
  lifeAreaFocus,
  onOpenDetail
}: {
  aspects: SkySnapshot["aspects"];
  positions: PlanetPosition[];
  generatedAt: string;
  generatedContent: GeneratedContentMap;
  lifeAreaFocus: LifeAreaFocus[];
  onOpenDetail: (detail: SkyDetail) => void;
}) {
  const aspectGroups = useMemo(
    () => groupSkyAspectsByLifeArea(aspects, positions, lifeAreaFocus),
    [aspects, positions, lifeAreaFocus]
  );

  return (
    <SkyAspectsSection>
      {aspectGroups.map((group) => (
          <SkyAspectGroup id={group.key} key={group.key}>
              {group.aspects.map((aspect) => {
            const title = `${aspect.from} ${aspect.type} ${aspect.to}`;
            const timing = skyAspectTimingDisplay(aspect, generatedAt);
            const contentKey = currentSkyAspectContentId(aspect.from, aspect.type, aspect.to);
            const content = fallbackFromHook(
              "sky.aspect-detail",
              {
                planetA: aspect.from,
                aspect: aspect.type,
                planetB: aspect.to
              },
              approvedVoiceOrKnowledgeFallback(contentKey, "sky")
            );
            const generated = liveGeneratedContentByKeys(generatedContent, skyAspectGeneratedContentKeys(aspect, generatedAt));
            const rowSummary = liveGeneratedSummary(generated, content.summary);

                return (
                  <button
                    type="button"
                    className="aspect-row aspect-row-button"
                    key={`${aspect.from}-${aspect.to}`}
                    aria-label={`Read more about ${title}`}
                    onClick={() => onOpenDetail(currentSkyAspectDetailArticle(aspect, generatedAt, generatedContent))}
                  >
                    <AspectGlyphs from={aspect.from} aspect={aspect.type} to={aspect.to} />
                    <div className="aspect-row-copy">
                      <h3>{title}</h3>
                      <span className="aspect-row-timing" aria-label={timing.label}>
                        <span className="planet-placement-row__duration">{timing.durationLabel}</span>
                        <span>{timing.rangeLabel}</span>
                      </span>
                      {rowSummary ? <p>{rowSummary}</p> : null}
                    </div>
                    <span className="aspect-row-meta" aria-label={`${wholeDegreeOrb(aspect.orb)} orb`}>
                      <span className="aspect-row-dot" aria-hidden="true" />
                      <span>{wholeDegreeOrb(aspect.orb)}</span>
                    </span>
                  </button>
                );
              })}
        </SkyAspectGroup>
      ))}
    </SkyAspectsSection>
  );
}

function PlacementTable({
  positions,
  aspects,
  generatedAt,
  generatedContent,
  lifeAreaFocus,
  onOpenDetail
}: {
  positions: PlanetPosition[];
  aspects: SkySnapshot["aspects"];
  generatedAt: string;
  generatedContent: GeneratedContentMap;
  lifeAreaFocus: LifeAreaFocus[];
  onOpenDetail: (detail: SkyDetail) => void;
}) {
  const displayPositions = useMemo(() => skyNodeDisplayPositions(positions), [positions]);
  const orderedPositions = useMemo(
    () => rankSkyPositionsByLifeAreaFocus(
      skyPlacementPlanetOrder
        .map((planet) => displayPositions.find((position) => position.planet === planet))
        .filter((position): position is PlanetPosition => Boolean(position)),
      lifeAreaFocus
    ),
    [displayPositions, lifeAreaFocus]
  );
  const aspectsByPlacement = useMemo(() => {
    const nextAspects = new Map<string, SkySnapshot["aspects"]>();

    aspects.forEach((aspect) => {
      const fromAspects = nextAspects.get(aspect.from) ?? [];
      fromAspects.push(aspect);
      nextAspects.set(aspect.from, fromAspects);

      const toAspects = nextAspects.get(aspect.to) ?? [];
      toAspects.push(aspect);
      nextAspects.set(aspect.to, toAspects);
    });

    nextAspects.forEach((placementAspects, planet) => {
      nextAspects.set(planet, placementAspects.slice().sort((a, b) => a.orb - b.orb).slice(0, 2));
    });

    return nextAspects;
  }, [aspects]);

  return (
    <SkyPlacementList>
        {orderedPositions.map((position) => {
          const activeAspects = aspectsByPlacement.get(position.planet) ?? [];
          const title = placementDetailTitle(position, activeAspects);
          const dignity = placementDignity(position);
          const solarPhase = solarPhaseStatusFor(position, positions);
          const retrogradeWindow = position.motion === "retrograde"
            ? retrogradeWindowFor(position, generatedAt)
            : null;
          const retrogradeDurationLabel = formatRetrogradeDuration(
            retrogradeWindow?.retrogradeStart,
            retrogradeWindow?.retrogradeEnd
          );
          const statuses = placementStatuses(position);
          const durationLabel = compactTransitDurationLabel(position, generatedAt);
          const transitRangeLabel = placementTransitRangeLabel(position, generatedAt);
          const contentKey = placementContentId(position.planet, position.sign, "sky");
          const localContent = approvedVoiceOrKnowledgeFallback(contentKey, "sky");
          const placementHookKey = position.planet === "Sun"
            ? "sky.seasonal-current"
            : position.planet === "Moon"
              ? "sky.lunar-cycle"
              : "sky.planetary-placement";
          const content = fallbackFromHook(
            placementHookKey,
            {
              planet: position.planet,
              sign: position.sign
            },
            localContent
          );
          const generated = liveGeneratedContentByKeys(generatedContent, skyPlacementGeneratedContentKeys(position, generatedAt));
          const detailParagraphs = liveGeneratedBody(generated, content.detailParagraphs);
          const body = detailParagraphs;
          const relatedAspectRows = relatedAspectRowsForPlacement({
            aspects: activeAspects,
            generatedAt,
            generatedContent,
            mode: "sky",
            onOpenSkyAspect: (aspect) => onOpenDetail(currentSkyAspectDetailArticle(aspect, generatedAt, generatedContent)),
            pointName: position.planet
          });
          const openDetail = () => onOpenDetail({
            glyph: detailGlyphForPlacement(position, activeAspects),
            kicker: placementDetailKicker(position, activeAspects),
            title: generated?.headline ?? title,
            meta: `${formatPlacementPosition(position).toUpperCase()} · ${transitRangeLabel}`,
            retrograde: position.motion === "retrograde",
            body,
            sections: generatedDetailSections(generated),
            relatedAspects: relatedAspectRows.length > 0
              ? {
                  heading: `Aspects to ${position.planet} today`,
                  rows: relatedAspectRows
                }
              : undefined,
            astrologyDrilldown: generatedAstrologyDrilldown(generated),
            content: content.bundle
          });

          return (
            <SkyPlacementListItem id={position.planet} key={position.planet}>
              <PlanetPlacementRow
                ariaLabel={`Read more about ${title}`}
                degree={formatPlanetDegree(position)}
                dignity={dignity}
                durationLabel={durationLabel}
                glyph={position.glyph}
                onClick={openDetail}
                pointName={position.planet}
                rangeLabel={transitRangeLabel}
                retrograde={position.motion === "retrograde"}
                retrogradeDurationLabel={retrogradeDurationLabel}
                statuses={solarPhase ? [...statuses, solarPhase] : statuses}
                title={natalPlacementTitle(position)}
                variant="sky"
              />
            </SkyPlacementListItem>
          );
        })}
    </SkyPlacementList>
  );
}

function CreateChartFlow({
  form,
  setForm,
  profile,
  step,
  setStep,
  onSave
}: {
  form: TransitForm;
  setForm: (form: TransitForm) => void;
  profile: UserProfile | null;
  step: "overview" | "birth" | "city";
  setStep: (step: "overview" | "birth" | "city") => void;
  onSave: (options?: { closeModal?: boolean; nextStep?: "overview" | "birth" | "city" }) => void | Promise<void>;
}) {
  function updateField<Key extends keyof TransitForm>(key: Key, value: TransitForm[Key]) {
    setForm({ ...form, [key]: value });
  }

  function updateNumberField<Key extends keyof TransitForm>(key: Key, value: string, maxLength = 2) {
    updateField(key, value.replace(/\D/g, "").slice(0, maxLength) as TransitForm[Key]);
  }

  function submitBirthForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSave({ closeModal: false, nextStep: "overview" });
  }

  function submitCityForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSave();
  }

  const primaryChart = profile?.charts[0];
  const accountComplete = Boolean(profile);
  const birthDate = formatSignupBirthDate({
    month: form.birthMonth,
    day: form.birthDay,
    year: form.birthYear
  }) || (primaryChart?.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(primaryChart.birthDate) ? primaryChart.birthDate : "");
  const birthComplete = Boolean(
    birthDate &&
    form.birthPlace.trim() &&
    (form.unknownBirthTime || formatSignupBirthTime({
      hour: form.birthHour,
      minute: form.birthMinute,
      meridiem: form.birthMeridiem
    }))
  );
  const currentCityComplete = Boolean(form.currentLocation.trim() || profile?.currentLocation?.trim());
  const flowSteps = [
    { id: "account", label: "Create account", status: accountComplete ? "complete" : "step 1", complete: accountComplete, icon: <User size={21} aria-hidden="true" />, onClick: null },
    { id: "birth", label: "Add birth information", status: birthComplete ? "complete" : accountComplete ? "next step" : "step 2", complete: birthComplete, icon: <CalendarDays size={21} aria-hidden="true" />, onClick: () => setStep("birth") },
    { id: "city", label: "Enter current city", status: currentCityComplete ? "complete" : birthComplete ? "next step" : "step 3", complete: currentCityComplete, icon: <MapPin size={21} aria-hidden="true" />, onClick: () => setStep("city") }
  ];

  if (step === "overview") {
    return (
      <div className="create-chart-flow create-chart-overview">
        <div className="chart-modal-heading">
          <h3 id="chart-modal-title">Create your chart</h3>
          <p>Three quick steps to unlock your personalized sky.</p>
        </div>

        <div className="create-chart-steps" aria-label="Create your chart steps">
          {flowSteps.map((flowStep, index) => (
            <div
              className={`create-chart-step-row ${flowStep.complete ? "complete" : ""} ${!flowStep.complete && flowSteps.findIndex((candidate) => !candidate.complete) === index ? "active" : ""}`}
              key={flowStep.id}
            >
              <span className="create-chart-rail" aria-hidden="true"><span /></span>
              <button
                className="create-chart-step"
                type="button"
                disabled={!flowStep.onClick}
                onClick={() => flowStep.onClick?.()}
              >
                <span className="create-chart-step-icon">{flowStep.icon}</span>
                <span className="create-chart-step-copy">
                  <span>{flowStep.status}</span>
                  <strong>{flowStep.label}</strong>
                </span>
                {flowStep.onClick && <ChevronRight size={20} aria-hidden="true" />}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step === "city") {
    return (
      <form className="create-chart-flow create-chart-detail" onSubmit={submitCityForm}>
        <div className="chart-modal-heading">
          <h3 id="chart-modal-title">Where are you now?</h3>
          <p>Your current city sets the sky for today's readings.</p>
        </div>

        <CitySearchField
          label="Current city"
          value={form.currentLocation}
          onChange={(value) => {
            setForm({ ...form, currentLocation: value, currentLocationData: null });
          }}
          onSelect={(suggestion) => {
            setForm({ ...form, currentLocation: suggestion.label, currentLocationData: suggestion });
          }}
          placeholder="New York City, NY"
          className="signup-city-search create-chart-city-search"
        />

        <button className="signup-submit create-chart-save" type="submit">Save location</button>
      </form>
    );
  }

  return (
    <form className="create-chart-flow create-chart-detail" onSubmit={submitBirthForm}>
      <div className="chart-modal-heading">
        <h3 id="chart-modal-title">Your birth information</h3>
        <p>This pinpoints the exact sky at your first breath.</p>
      </div>

      <div className="signup-fields create-chart-fields">
        <label className="signup-field">
          <span>Full name</span>
          <div>
            <input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Your name" />
          </div>
        </label>

        <div className="signup-grid">
          <label className="signup-field">
            <span>Date of birth</span>
            <div className="signup-date-control">
              <input
                aria-label="Birth month"
                inputMode="numeric"
                placeholder="MM"
                value={form.birthMonth}
                onChange={(event) => updateNumberField("birthMonth", event.target.value)}
              />
              <span aria-hidden="true">/</span>
              <input
                aria-label="Birth day"
                inputMode="numeric"
                placeholder="DD"
                value={form.birthDay}
                onChange={(event) => updateNumberField("birthDay", event.target.value)}
              />
              <span aria-hidden="true">/</span>
              <input
                aria-label="Birth year"
                inputMode="numeric"
                placeholder="YYYY"
                value={form.birthYear}
                onChange={(event) => updateNumberField("birthYear", event.target.value, 4)}
              />
            </div>
          </label>

          <label className="signup-field">
            <span>Time of birth</span>
            <div className="signup-time-control">
              <input
                aria-label="Birth hour"
                inputMode="numeric"
                placeholder="HH"
                value={form.birthHour}
                disabled={form.unknownBirthTime}
                onChange={(event) => updateNumberField("birthHour", event.target.value)}
              />
              <span className="time-separator" aria-hidden="true">:</span>
              <input
                aria-label="Birth minute"
                inputMode="numeric"
                placeholder="MM"
                value={form.birthMinute}
                disabled={form.unknownBirthTime}
                onChange={(event) => updateNumberField("birthMinute", event.target.value)}
              />
              <div className="signup-meridiem" aria-label="AM or PM">
                {(["AM", "PM"] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    className={form.birthMeridiem === period ? "active" : ""}
                    disabled={form.unknownBirthTime}
                    aria-pressed={form.birthMeridiem === period}
                    onClick={() => updateField("birthMeridiem", period)}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </label>
        </div>

        <label className="unknown-time">
          <input
            type="checkbox"
            checked={form.unknownBirthTime}
            onChange={(event) => {
              setForm({
                ...form,
                unknownBirthTime: event.target.checked,
                birthHour: event.target.checked ? "12" : form.birthHour,
                birthMinute: event.target.checked ? "00" : form.birthMinute,
                birthMeridiem: event.target.checked ? "PM" : form.birthMeridiem
              });
            }}
          />
          <span>I don't know my birth time.</span>
        </label>

        <CitySearchField
          label="Birth place"
          value={form.birthPlace}
          onChange={(value) => {
            setForm({ ...form, birthPlace: value, birthLocation: null });
          }}
          onSelect={(suggestion) => {
            setForm({ ...form, birthPlace: suggestion.label, birthLocation: suggestion });
          }}
          placeholder="Manhattan, NY"
          className="signup-city-search create-chart-city-search"
        />
      </div>

      <button className="signup-submit create-chart-save" type="submit">Save birth details</button>
    </form>
  );
}

function TransitResults({
  form,
  transits,
  selectedTransit,
  selectedTransitId,
  setSelectedTransitId
}: {
  form: TransitForm;
  transits: TransitItem[];
  selectedTransit: TransitItem;
  selectedTransitId: string;
  setSelectedTransitId: (id: string) => void;
}) {
  const shortTransits = transits.filter((transit) => transit.term === "short");
  const longTransits = transits.filter((transit) => transit.term === "long");
  const chartDate = new Date(`${form.chartDate}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  return (
    <section className="transit-results" aria-label="Daily transits">
      <div className="transit-summary">
        <div>
          <span>Birth chart details</span>
          <strong>{form.name || "Unnamed chart"}</strong>
          <p>{form.birthMonth} {form.birthDay}, {form.birthYear} · {form.unknownBirthTime ? "Time unknown" : `${form.birthHour}:${form.birthMinute.padStart(2, "0")} ${form.birthMeridiem}`}</p>
          <p>{form.birthPlace}</p>
        </div>
        <div>
          <span>Chart of day</span>
          <strong>{chartDate}</strong>
          {form.currentLocation && <p>{form.currentLocation}</p>}
        </div>
      </div>

      <div className="transit-heading-row">
        <div>
          <span>Daily transits</span>
          <strong>{new Date(`${form.chartDate}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</strong>
        </div>
      </div>

      <div className="transit-lists">
        <TransitList title="Short term transits" transits={shortTransits} selectedTransitId={selectedTransitId} setSelectedTransitId={setSelectedTransitId} />
        <TransitList title="Long term transits" transits={longTransits} selectedTransitId={selectedTransitId} setSelectedTransitId={setSelectedTransitId} />
      </div>

      <TransitDetail transit={selectedTransit} form={form} />
    </section>
  );
}

function TransitList({
  title,
  transits,
  selectedTransitId,
  setSelectedTransitId
}: {
  title: string;
  transits: TransitItem[];
  selectedTransitId: string;
  setSelectedTransitId: (id: string) => void;
}) {
  return (
    <section className="transit-list" aria-label={title}>
      <h3>{title}</h3>
      {transits.map((transit) => (
        <button
          key={transit.id}
          className={selectedTransitId === transit.id ? "transit-row active" : "transit-row"}
          type="button"
          onClick={() => setSelectedTransitId(transit.id)}
        >
          <span className="aspect-glyph">{transit.glyph}</span>
          <span className="transit-name">
            <strong>{transit.transitPlanet}</strong>
            <em>{transit.aspect}</em>
            <strong>{transit.natalPoint}</strong>
          </span>
          <span className="orb">{transit.orb}</span>
          {transit.direction === "applying" ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
        </button>
      ))}
    </section>
  );
}

function TransitDetail({ transit, form }: { transit: TransitItem; form: TransitForm }) {
  const content = fallbackFromHook(
    "you.transit-to-natal",
    {
      transitPlanet: transit.transitPlanet,
      aspect: transit.aspect,
      natalPoint: transit.natalPoint
    },
    approvedVoiceOrKnowledgeFallback(transitNatalContentId(transit.transitPlanet, transit.aspect, transit.natalPoint))
  );
  const readTitle = content.summary ?? interpretationInReviewSummary;
  const readParagraphs = hasApprovedVoiceContent(content) && content.detailParagraphs.length > 0
    ? content.detailParagraphs
    : interpretationInReviewParagraphs;
  const maxOrb = Math.max(1, ...transit.arc);
  const chartDate = new Date(`${form.chartDate}T12:00:00`);
  const arcStartDate = new Date(chartDate);
  const arcMiddleDate = new Date(chartDate);
  const arcEndDate = new Date(chartDate);
  arcStartDate.setDate(chartDate.getDate() - 3);
  arcEndDate.setDate(chartDate.getDate() + 3);
  const arcDateLabel = (date: Date) => date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const points = transit.arc.map((value, index) => {
    const x = 24 + index * 56;
    const y = 104 - (value / maxOrb) * 72;
    return `${x},${y}`;
  }).join(" ");

  return (
    <section className="transit-detail" aria-label="Transit in detail">
      <div>
        <span>Transit in detail</span>
        <h3>{transit.transitPlanet} <em>{transit.aspect}</em> {transit.natalPoint}</h3>
        <ul>
          <li>{transit.transitPlanet} in today's sky</li>
          <li>is {transit.aspect} to</li>
          <li>your natal {transit.natalPoint} in {transit.natalSign}</li>
        </ul>
      </div>
      <div className="orb-card">
        <h4>Orb change over {arcDateLabel(chartDate)}</h4>
        <svg viewBox="0 0 330 130" role="img" aria-label="Orb change chart">
          <g className="orb-grid">
            <line x1="24" y1="24" x2="304" y2="24" />
            <line x1="24" y1="64" x2="304" y2="64" />
            <line x1="24" y1="104" x2="304" y2="104" />
          </g>
          <polyline points={points} />
          <text x="24" y="123">{arcDateLabel(arcStartDate)}</text>
          <text x="142" y="123">{arcDateLabel(arcMiddleDate)}</text>
          <text x="274" y="123">{arcDateLabel(arcEndDate)}</text>
        </svg>
      </div>
      <article className="read-closely">
        <span>Read it closely</span>
        <h3>{readTitle}</h3>
        {readParagraphs.map((paragraph, index) => (
          <p key={`${transit.id}-detail-${index}`}>{paragraph}</p>
        ))}
      </article>
    </section>
  );
}

function SignupView({ initialMode = "create", onClose, onCreateProfile }: { initialMode?: AuthMode; onClose: () => void; onCreateProfile: (profile: UserProfile) => void }) {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [form, setForm] = useState<SignupForm>(defaultSignupForm);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [authStatus, setAuthStatus] = useState<"idle" | "loading">("idle");
  const [authMessage, setAuthMessage] = useState("");
  const [birthDateParts, setBirthDateParts] = useState<SignupDateParts>(() => splitSignupBirthDate(defaultSignupForm.birthDate));
  const birthTimeParts = splitSignupBirthTime(form.birthTime);
  const isLogin = authMode === "login";

  useEffect(() => {
    setAuthMode(initialMode);
  }, [initialMode]);

  function updateField<Key extends keyof SignupForm>(key: Key, value: SignupForm[Key]) {
    setForm({ ...form, [key]: value });
  }

  function updateBirthTime(part: keyof SignupTimeParts, value: string) {
    const nextParts = {
      ...birthTimeParts,
      [part]: part === "meridiem" ? value as SignupTimeParts["meridiem"] : value.replace(/\D/g, "").slice(0, 2)
    };

    updateField("birthTime", formatSignupBirthTime(nextParts));
  }

  function updateBirthDate(part: keyof SignupDateParts, value: string) {
    const maxLength = part === "year" ? 4 : 2;
    const nextParts = {
      ...birthDateParts,
      [part]: value.replace(/\D/g, "").slice(0, maxLength)
    };

    setBirthDateParts(nextParts);
    updateField("birthDate", formatSignupBirthDate(nextParts));
  }

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAuthConfigured) {
      setAuthMessage(`Add Supabase environment variables to enable real email ${isLogin ? "login" : "signup"}.`);
      return;
    }

    if (!form.email.trim() || !form.password.trim()) {
      setAuthMessage(`Add an email and password to ${isLogin ? "log in" : "create your account"}.`);
      return;
    }

    setAuthStatus("loading");
    setAuthMessage("");
    if (!isLogin) {
      savePendingSignupForm(form);
    }

    try {
      const account = isLogin
        ? await signInWithEmail({
            email: form.email.trim(),
            password: form.password
          })
        : await signUpWithEmail({
            email: form.email.trim(),
            password: form.password,
            fullName: form.fullName.trim()
          });

      if (account) {
        onCreateProfile(createUserProfile(form, "email", account));
        clearPendingSignupForm();
      } else {
        setAuthMessage("Check your email to confirm your account.");
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Email signup failed.");
    } finally {
      setAuthStatus("idle");
    }
  }

  async function socialSignup(provider: "google") {
    if (!isAuthConfigured) {
      setAuthMessage("Add Supabase environment variables to enable real social sign-on.");
      return;
    }

    setAuthStatus("loading");
    setAuthMessage("");
    if (authMode === "create") {
      savePendingSignupForm(form);
    } else {
      clearPendingSignupForm();
    }

    try {
      await signInWithProvider(provider);
    } catch (error) {
      setAuthStatus("idle");
      setAuthMessage(error instanceof Error ? error.message : `${providerLabel(provider)} sign-on failed.`);
    }
  }

  return (
    <section className="auth-page signup-split" aria-label={isLogin ? "Log in" : "Create account"}>
      <button className="auth-close-button" type="button" aria-label="Close" onClick={onClose}>
        <X size={20} aria-hidden="true" />
      </button>
      <div className="auth-shell">
        <form className="signup-form auth-card" onSubmit={submitSignup}>
          <div className="signup-heading">
            <p className="auth-card__title">{isLogin ? "Log in" : "Create profile"}</p>
            {isLogin && <h3>Return to your sky.</h3>}
          </div>

        {!isAuthConfigured && (
          <p className="auth-message">
            Add VITE_SUPABASE_URL and a Supabase publishable key to enable live sign-on.
          </p>
        )}

        <div className="social-signons" aria-label="Social sign on">
          <button className="google-auth-button" type="button" disabled={authStatus === "loading"} onClick={() => socialSignup("google")}>
            <GoogleIcon />
            Continue with Google
          </button>
        </div>

        {authMessage && <p className="auth-message">{authMessage}</p>}

        <div className="email-divider auth-divider"><span>or with email</span></div>

        <div className="signup-fields">
          {!isLogin && (
            <label className="signup-field auth-field">
              <span className="auth-label">Full name</span>
              <div>
                <input className="auth-input" value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} placeholder="Jules Okafor" />
              </div>
            </label>
          )}

          <label className="signup-field auth-field">
            <span className="auth-label">Email</span>
            <div>
              <input className="auth-input" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="you@somewhere.com" />
            </div>
          </label>

          <label className="signup-field auth-field">
            <span className="auth-label">Password</span>
            <div className="password-control">
              <input
                className="auth-input"
                type={passwordVisible ? "text" : "password"}
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                placeholder="at least 8 characters"
              />
              <button
                type="button"
                aria-label={passwordVisible ? "Hide password" : "Show password"}
                title={passwordVisible ? "Hide password" : "Show password"}
                onClick={() => setPasswordVisible((isVisible) => !isVisible)}
              >
                {passwordVisible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
              </button>
            </div>
          </label>

          {!isLogin && (
            <>
              <CitySearchField
                label="Birth city"
                value={form.birthCity}
                onChange={(value) => setForm({ ...form, birthCity: value, birthLocation: null })}
                onSelect={(suggestion) => setForm({ ...form, birthCity: suggestion.label, birthLocation: suggestion })}
                placeholder="Birth city"
                className="signup-city-search"
              />

              <div className="signup-grid auth-birth-grid">
                <label className="signup-field auth-field">
                  <span className="auth-label">Birth date</span>
                  <div className="signup-date-control auth-date-inputs">
                    <input
                      className="auth-input"
                      aria-label="Birth month"
                      inputMode="numeric"
                      placeholder="MM"
                      value={birthDateParts.month}
                      onChange={(event) => updateBirthDate("month", event.target.value)}
                    />
                    <span aria-hidden="true">/</span>
                    <input
                      className="auth-input"
                      aria-label="Birth day"
                      inputMode="numeric"
                      placeholder="DD"
                      value={birthDateParts.day}
                      onChange={(event) => updateBirthDate("day", event.target.value)}
                    />
                    <span aria-hidden="true">/</span>
                    <input
                      className="auth-input"
                      aria-label="Birth year"
                      inputMode="numeric"
                      placeholder="YYYY"
                      value={birthDateParts.year}
                      onChange={(event) => updateBirthDate("year", event.target.value)}
                    />
                  </div>
                </label>

                <label className="signup-field auth-field">
                  <span className="auth-label">Birth time</span>
                  <div className="signup-time-control auth-time-inputs">
                    <input
                      className="auth-input"
                      aria-label="Birth hour"
                      inputMode="numeric"
                      placeholder="HH"
                      value={birthTimeParts.hour}
                      disabled={form.unknownBirthTime}
                      onChange={(event) => updateBirthTime("hour", event.target.value)}
                    />
                    <span className="time-separator" aria-hidden="true">:</span>
                    <input
                      className="auth-input"
                      aria-label="Birth minute"
                      inputMode="numeric"
                      placeholder="MM"
                      value={birthTimeParts.minute}
                      disabled={form.unknownBirthTime}
                      onChange={(event) => updateBirthTime("minute", event.target.value)}
                    />
                    <div className="signup-meridiem auth-ampm-toggle" aria-label="AM or PM">
                      {(["AM", "PM"] as const).map((period) => (
                        <button
                          key={period}
                          type="button"
                          className={birthTimeParts.meridiem === period ? "active is-active" : ""}
                          disabled={form.unknownBirthTime}
                          aria-pressed={birthTimeParts.meridiem === period}
                          onClick={() => updateBirthTime("meridiem", period)}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>
                </label>
              </div>

              <label className="unknown-time auth-checkbox-row">
                <input
                  type="checkbox"
                  checked={form.unknownBirthTime}
                  onChange={(event) => {
                    setForm({ ...form, unknownBirthTime: event.target.checked, birthTime: event.target.checked ? "12:00 PM" : form.birthTime });
                  }}
                />
                <span>I don't know my birth time.</span>
              </label>
            </>
          )}
        </div>

        <button className="signup-submit auth-primary-button" type="submit" disabled={authStatus === "loading"}>
          {authStatus === "loading" ? "Working..." : isLogin ? "Log in →" : "Create Account →"}
        </button>
        <p className="signin-note">
          {isLogin ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setAuthMessage("");
              setAuthMode(isLogin ? "create" : "login");
            }}
          >
            {isLogin ? "Create an account" : "Login"}
          </button>
        </p>
        </form>
      </div>
    </section>
  );
}

function SettingsView({
  profile,
  onUpdateProfile,
  theme,
  sunriseOrbEnabled,
  dyslexiaFriendlyFont,
  onThemeChange,
  onSunriseOrbChange,
  onDyslexiaFontChange,
  onHouseSignLabelStyleChange
}: {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  theme: UiTheme;
  sunriseOrbEnabled: boolean;
  dyslexiaFriendlyFont: boolean;
  onThemeChange: (theme: UiTheme) => void;
  onSunriseOrbChange: (enabled: boolean) => void;
  onDyslexiaFontChange: (enabled: boolean) => void;
  onHouseSignLabelStyleChange: (style: HouseSignLabelStyle) => void;
}) {
  const [currentCity, setCurrentCity] = useState(profile.currentLocation ?? "");
  const [currentLocationData, setCurrentLocationData] = useState<LocationInput | null>(profile.currentLocationData ?? null);
  const [currentLocationEditing, setCurrentLocationEditing] = useState(false);
  const currentCityDisplay = compactCityLabel(profile.currentLocation || defaultLocation.label);
  const chartSettings = normalizeChartSettings(profile.settings);

  function updateHouseSignLabelStyle(houseSignLabelStyle: HouseSignLabelStyle) {
    onHouseSignLabelStyleChange(houseSignLabelStyle);
    onUpdateProfile({
      ...profile,
      settings: {
        ...chartSettings,
        houseSignLabelStyle
      }
    });
  }

  function startCurrentLocationEdit() {
    setCurrentCity(profile.currentLocation || defaultLocation.label);
    setCurrentLocationData(profile.currentLocationData ?? withTimeZone(defaultLocation));
    setCurrentLocationEditing(true);
  }

  function cancelCurrentLocationEdit() {
    setCurrentCity(profile.currentLocation ?? "");
    setCurrentLocationData(profile.currentLocationData ?? null);
    setCurrentLocationEditing(false);
  }

  function saveCurrentLocation() {
    const trimmed = currentCity.trim();
    const nextLocation = trimmed
      ? currentLocationData?.label === trimmed
        ? withTimeZone(currentLocationData)
        : locationFromLabel(trimmed)
      : withTimeZone(defaultLocation);

    onUpdateProfile({
      ...profile,
      currentLocation: nextLocation.label,
      currentLocationData: nextLocation
    });
    setCurrentCity(nextLocation.label);
    setCurrentLocationData(nextLocation);
    setCurrentLocationEditing(false);
  }

  return (
    <section className="settings-page page-shell--narrow" aria-label="Settings">
      <div className="settings-header">
        <h1>settings.</h1>
      </div>

      <div className="settings-panel">
        <section className="settings-group" aria-label="Personalization settings">
          <span className="settings-group-label">Account</span>
          <div className="settings-card">
            <div className="settings-list" aria-label="Account settings">
              {currentLocationEditing ? (
                <div className="settings-row settings-location-editor">
                  <CitySearchField
                    label="Current location"
                    value={currentCity}
                    onChange={(value) => {
                      setCurrentCity(value);
                      setCurrentLocationData(null);
                    }}
                    onSelect={(suggestion) => {
                      setCurrentCity(suggestion.label);
                      setCurrentLocationData(suggestion);
                    }}
                    placeholder={defaultLocation.label}
                    className="settings-city-search"
                  />
                  <div className="settings-location-actions">
                    <button className="settings-location-cancel" type="button" onClick={cancelCurrentLocationEdit}>
                      Cancel
                    </button>
                    <button className="settings-location-save" type="button" onClick={saveCurrentLocation}>
                      Save location
                    </button>
                  </div>
                </div>
              ) : (
                <button className="settings-row settings-row-button" type="button" onClick={startCurrentLocationEdit}>
                  <span className="settings-row__label">Current location</span>
                  <span className="settings-row__value">{currentCityDisplay}</span>
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="settings-group" aria-label="Display settings">
          <span className="settings-group-label">Display</span>
          <div className="settings-card">
            <div className="settings-list" aria-label="Display settings">
              <div className="settings-row settings-row-control">
                <span className="settings-row__label">Theme</span>
                <AppearanceToggle theme={theme} onThemeChange={onThemeChange} />
              </div>
              <div className="settings-row settings-row-control">
                <div className="settings-row-copy">
                  <span className="settings-row-title">Gradient</span>
                  <small className="settings-row-description">Show the sunrise gradient background across the website.</small>
                </div>
                <SwitchControl
                  checked={sunriseOrbEnabled}
                  label="Toggle gradient background"
                  onChange={onSunriseOrbChange}
                />
              </div>
              <div className="settings-row settings-row-control">
                <div className="settings-row-copy">
                  <span className="settings-row-title">Dyslexia-friendly font</span>
                  <small className="settings-row-description">Use a more open, readable text face across the app.</small>
                </div>
                <SwitchControl
                  checked={dyslexiaFriendlyFont}
                  label="Toggle dyslexia-friendly font"
                  onChange={onDyslexiaFontChange}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="settings-group" aria-label="Astrology settings">
          <span className="settings-group-label">Astrology settings</span>
          <div className="settings-card">
            <div className="settings-list" aria-label="Astrology settings">
              <div className="settings-row settings-row-control">
                <div className="settings-row-copy">
                  <span className="settings-row-title">House sign labels</span>
                  <small className="settings-row-description">How the house sign names appear around the zodiac wheel.</small>
                </div>
                <HouseSignLabelToggle
                  value={chartSettings.houseSignLabelStyle}
                  onChange={updateHouseSignLabelStyle}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="settings-group" aria-label="Chart defaults">
          <span className="settings-group-label">Birth chart</span>
          <div className="settings-card">
            <div className="settings-list" aria-label="Birth chart settings">
              <div className="settings-row">
                <span className="settings-row__label">House system</span>
                <span className="settings-row__value">Whole House</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

function GuestSettingsView({
  theme,
  location,
  sunriseOrbEnabled,
  dyslexiaFriendlyFont,
  onThemeChange,
  onSunriseOrbChange,
  onDyslexiaFontChange,
  houseSignLabelStyle,
  onHouseSignLabelStyleChange
}: {
  theme: UiTheme;
  location: LocationInput;
  sunriseOrbEnabled: boolean;
  dyslexiaFriendlyFont: boolean;
  onThemeChange: (theme: UiTheme) => void;
  onSunriseOrbChange: (enabled: boolean) => void;
  onDyslexiaFontChange: (enabled: boolean) => void;
  houseSignLabelStyle: HouseSignLabelStyle;
  onHouseSignLabelStyleChange: (style: HouseSignLabelStyle) => void;
}) {
  return (
    <section className="settings-page page-shell--narrow guest-settings-page" aria-label="Settings">
      <div className="settings-header">
        <h1>settings.</h1>
      </div>

      <div className="settings-panel">
        <section className="settings-group" aria-label="Personal settings">
          <span className="settings-group-label">Account</span>
          <div className="settings-card">
            <div className="settings-list">
              <div className="settings-row">
                <span className="settings-row__label">Current location</span>
                <span className="settings-row__value">{compactCityLabel(location.label)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-group" aria-label="Display settings">
          <span className="settings-group-label">Display</span>
          <div className="settings-card">
            <div className="settings-list">
              <div className="settings-row settings-row-control">
                <span className="settings-row__label">Theme</span>
                <AppearanceToggle theme={theme} onThemeChange={onThemeChange} />
              </div>
              <div className="settings-row settings-row-control">
                <div className="settings-row-copy">
                  <span className="settings-row-title">Gradient</span>
                  <small className="settings-row-description">Show the sunrise gradient background across the website.</small>
                </div>
                <SwitchControl
                  checked={sunriseOrbEnabled}
                  label="Toggle gradient background"
                  onChange={onSunriseOrbChange}
                />
              </div>
              <div className="settings-row settings-row-control">
                <div className="settings-row-copy">
                  <span className="settings-row-title">Dyslexia-friendly font</span>
                  <small className="settings-row-description">Use a more open, readable text face across the app.</small>
                </div>
                <SwitchControl
                  checked={dyslexiaFriendlyFont}
                  label="Toggle dyslexia-friendly font"
                  onChange={onDyslexiaFontChange}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="settings-group" aria-label="Astrology settings">
          <span className="settings-group-label">Astrology settings</span>
          <div className="settings-card">
            <div className="settings-list">
              <div className="settings-row settings-row-control">
                <div className="settings-row-copy">
                  <span className="settings-row-title">House sign labels</span>
                  <small className="settings-row-description">How the house sign names appear around the zodiac wheel.</small>
                </div>
                <HouseSignLabelToggle
                  value={houseSignLabelStyle}
                  onChange={onHouseSignLabelStyleChange}
                />
              </div>
            </div>
          </div>
        </section>

      </div>
    </section>
  );
}

function AccountView({
  profile,
  onSignOut,
  onUpdateProfile
}: {
  profile: UserProfile;
  onSignOut: () => void | Promise<void>;
  onUpdateProfile: (profile: UserProfile) => void;
}) {
  const primaryChart = profile.charts[0];
  const savedBirthDate = validChartBirthDate(primaryChart);
  const savedBirthTime = validChartBirthTime(primaryChart);
  const savedBirthCity = validChartBirthCity(primaryChart);
  const [draftBirthDate, setDraftBirthDate] = useState(savedBirthDate);
  const [draftBirthTime, setDraftBirthTime] = useState(savedBirthTime);
  const [draftBirthCity, setDraftBirthCity] = useState(savedBirthCity);

  useEffect(() => {
    setDraftBirthDate(savedBirthDate);
    setDraftBirthTime(savedBirthTime);
    setDraftBirthCity(savedBirthCity);
  }, [savedBirthDate, savedBirthTime, savedBirthCity]);

  const birthDraftDirty =
    draftBirthDate !== savedBirthDate ||
    draftBirthTime !== savedBirthTime ||
    draftBirthCity !== savedBirthCity;

  const saveBirthChartDetails = () => {
    const nextBirthDate = draftBirthDate.trim();
    const nextBirthTime = draftBirthTime.trim();
    const nextBirthCity = draftBirthCity.trim();
    const baseChart: UserChart = primaryChart ?? {
      id: `chart-${Date.now()}`,
      name: chartNameFromProfile(profile.name),
      type: "Birth chart",
      birthDate: "Birth date needed",
      birthTime: "Birth time needed",
      birthCity: "Birth city needed",
      birthLocation: null
    };
    const nextChart: UserChart = {
      ...baseChart,
      name: baseChart.name || chartNameFromProfile(profile.name),
      birthDate: nextBirthDate || "Birth date needed",
      birthTime: nextBirthTime || "Birth time needed",
      birthCity: nextBirthCity || "Birth city needed",
      birthLocation: baseChart.birthLocation ?? null
    };

    onUpdateProfile({
      ...profile,
      sun: nextBirthDate ? zodiacFromBirthDate(nextBirthDate) : profile.sun,
      charts: primaryChart
        ? profile.charts.map((chart, index) => (index === 0 ? nextChart : chart))
        : [nextChart]
    });
  };

  return (
    <section className="account-page page-shell--narrow" aria-label="Account">
      <div className="account-page-heading">
        <h1>account.</h1>
      </div>

      <section className="settings-card settings-account-card" aria-label="Account details">
        <div className="settings-profile-row">
          <ProfileAvatar avatarUrl={profile.avatarUrl} email={profile.email} name={profile.name} size="large" />
          <div>
            <h3>{profile.name}</h3>
            <span>{profile.email}</span>
          </div>
        </div>

        <div className="settings-list">
          <div className="settings-row">
            <span className="settings-row__label">Name</span>
            <span className="settings-row__value">{profile.name}</span>
          </div>
          <div className="settings-row">
            <span className="settings-row__label">Email</span>
            <span className="settings-row__value">{profile.email}</span>
          </div>
          <div className="settings-row">
            <span className="settings-row__label">Signed in with</span>
            <span className="settings-row__value settings-row__value--provider">{profile.provider === "google" ? "Google" : "Email"}</span>
          </div>
          <button type="button" className="settings-row settings-signout-row" onClick={onSignOut}>
            <span className="settings-row__action">Sign out</span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="settings-group account-chart-group" aria-label="Birth chart">
        <span className="settings-group-label">Birth chart</span>
        <div className="settings-card">
          <div className="settings-list">
            <label className="settings-row account-editable-row">
              <span>Date</span>
              <input
                className="account-row-input"
                type="date"
                value={draftBirthDate}
                onChange={(event) => setDraftBirthDate(event.target.value)}
                aria-label="Birth date"
              />
            </label>
            <label className="settings-row account-editable-row">
              <span>Time</span>
              <input
                className="account-row-input"
                type="text"
                inputMode="text"
                value={draftBirthTime}
                onChange={(event) => setDraftBirthTime(event.target.value)}
                placeholder="Not set"
                aria-label="Birth time"
              />
            </label>
            <label className="settings-row account-editable-row">
              <span>Place</span>
              <input
                className="account-row-input"
                type="text"
                value={draftBirthCity}
                onChange={(event) => setDraftBirthCity(event.target.value)}
                placeholder="Not set"
                aria-label="Birth place"
              />
            </label>
            <div className="settings-row">
              <span className="settings-row__label">House system</span>
              <span className="settings-row__value">Whole House</span>
            </div>
            {birthDraftDirty && (
              <div className="settings-row account-birth-save-row">
                <span>Birth details</span>
                <button
                  className="account-birth-save-button"
                  type="button"
                  onClick={saveBirthChartDetails}
                >
                  Save changes
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}

function ProfileView({
  profile,
  transitForm,
  transitItems,
  natalSky,
  personalTiming,
  personalTimingGenerated,
  personalTimingGeneratedStatus,
  personalTimingStatus,
  personalTransitGeneratedContent,
  transitsDrawn,
  selectedTransitId,
  setSelectedTransitId,
  onCreateChart,
  generatedContent
}: {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  transitForm: TransitForm;
  transitItems: TransitItem[];
  natalSky: SkySnapshot | null;
  personalTiming: PersonalTimingResponse | null;
  personalTimingGenerated: LiveGeneratedContent | null;
  personalTimingGeneratedStatus: PersonalTimingStatus;
  personalTimingStatus: PersonalTimingStatus;
  personalTransitGeneratedContent: GeneratedContentMap;
  transitsDrawn: boolean;
  selectedTransit: TransitItem;
  selectedTransitId: string;
  setSelectedTransitId: (id: string) => void;
  onCreateChart: () => void;
  generatedContent: GeneratedContentMap;
}) {
  const [transitArticle, setTransitArticle] = useState<YouTransitArticle | null>(null);
  const [activePlacementRouteId, setActivePlacementRouteId] = useState<string | null>(null);
  const [placementWriteups, setPlacementWriteups] = useState<GeneratedContentMap>(() => new Map());
  const [seededPlacementDrafts, setSeededPlacementDrafts] = useState<Set<string>>(() => new Set());
  const primaryChart = profile.charts[0];
  const savedBirthDate = validChartBirthDate(primaryChart);
  const savedBirthTime = primaryChart?.birthTime && primaryChart.birthTime !== "Birth time needed"
    ? primaryChart.birthTime
    : "";
  const savedBirthCity = primaryChart?.birthCity && primaryChart.birthCity !== "Birth city needed" ? primaryChart.birthCity : "";
  const hasSavedBirthDetails = Boolean(savedBirthDate && savedBirthTime && savedBirthCity);
  const hasSavedCurrentCity = Boolean(profile.currentLocation?.trim());
  const setupStepsLeft = chartFlowStepsLeft(profile);
  const unknownBirthTime = savedBirthTime === "Time unknown";
  const calculatedBigThree = natalSky ? natalBigThreeFromSky(natalSky, unknownBirthTime) : null;
  const profileSun = profile.sun && profile.sun !== "Sun pending" ? profile.sun : "";
  const profileMoon = profile.moon && profile.moon !== "Moon pending" ? profile.moon : "";
  const profileRising = profile.rising && profile.rising !== "Rising pending" ? profile.rising : "";
  const displaySun = calculatedBigThree?.sun ?? profileSun;
  const displayMoon = calculatedBigThree?.moon ?? profileMoon;
  const displayRising = calculatedBigThree?.rising ?? (unknownBirthTime ? "Rising pending" : profileRising);
  const signaturesReady = Boolean(displaySun && displayMoon && (unknownBirthTime || displayRising));
  const safeSun = displaySun || "your Sun";
  const safeMoon = displayMoon || "your Moon";
  const safeRising = displayRising || "your rising sign";
  const natalPositions = natalSky?.positions ?? [];
  const natalSun = natalPositions.find((position) => position.planet === "Sun");
  const natalMoon = natalPositions.find((position) => position.planet === "Moon");
  const natalListOrder = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
  const planetRows = natalListOrder
    .map((planet) => natalPositions.find((position) => position.planet === planet))
    .filter((position): position is PlanetPosition => Boolean(position));
  const routeableNatalPositions = [natalSun, natalMoon, ...planetRows].filter((position): position is PlanetPosition => Boolean(position));
  const occupiedNatalHouses = new Set(
    routeableNatalPositions
      .map((position) => position.house)
      .filter((house): house is number => typeof house === "number")
  );
  const emptyNatalHouses = Array.from({ length: 12 }, (_, index) => index + 1)
    .filter((house) => !occupiedNatalHouses.has(house));
  const natalAspectRows = (natalSky?.aspects ?? []).slice(0, 8);
  const chartSettings = normalizeChartSettings(profile.settings);
  const lifeAreaFocus = chartSettings.lifeAreaFocus;
  const houseSignLabelStyle = chartSettings.houseSignLabelStyle;
  const aspectRows = rankTransitsByLifeAreaFocus(transitItems, lifeAreaFocus).slice(0, 8);
  const elementalBalance = natalElementBalance(natalPositions);
  const elementalSummary = elementalBalanceSummary(elementalBalance);
  const plutoSignature = natalPositions.find((position) => position.planet === "Pluto");
  const signatureTitle = plutoSignature?.house === 7 ? "Relationships remake you" : `${safeSun} shapes your center`;
  const signatureBody = plutoSignature?.house === 7
    ? "Pluto sits angular in your 7th house, so partnership is where your deepest growth and power dynamics often play out. Nothing about love stays surface-level."
    : `${natalSun ? natalPlacementTitle(natalSun) : `Sun in ${safeSun}`} sets the center of gravity, while ${safeMoon} and ${safeRising} shape how the chart meets the world.`;
  const showNatalSignatures = false;
  const placementPositionByRouteId = (placementId: string | null) => (
    placementId ? routeableNatalPositions.find((position) => natalPlacementRouteId(position) === placementId) ?? null : null
  );
  const loadOrSeedPlacementWriteup = async (position: PlanetPosition) => {
    const contentKey = natalPlacementWriteupContentKey(position);
    const subjectId = natalPlacementWriteupSubjectId(primaryChart?.id);

    try {
      const existing = await loadUserGeneratedInterpretation({
        subjectType: "natal_placement",
        subjectId,
        contentKey
      });

      if (existing) {
        setPlacementWriteups((current) => {
          if (current.get(contentKey)?.id === existing.id) {
            return current;
          }

          const next = new Map(current);
          next.set(contentKey, existing);
          return next;
        });
        return existing;
      }

      if (seededPlacementDrafts.has(contentKey)) {
        return null;
      }

      const insight = natalHouseInsightForPosition(position, natalSky);
      setSeededPlacementDrafts((current) => {
        const next = new Set(current);
        next.add(contentKey);
        return next;
      });

      await generateUserContent({
        subjectType: "natal_placement",
        subjectId,
        contentKey,
        surface: "you",
        mode: "in_depth",
        eventType: "you-natal-placement",
        status: "DRAFT",
        headline: natalPlacementDetailTitle(position),
        facts: {
          type: "you_natal_placement_writeup",
          person: {
            name: profile.name,
            bigThree: {
              sun: profile.sun,
              moon: profile.moon,
              rising: profile.rising
            }
          },
          placement: {
            planet: position.planet,
            sign: position.sign,
            house: position.house,
            degree: formatPlanetDegree(position),
            dignity: placementDignity(position)?.label ?? null,
            retrograde: position.motion === "retrograde"
          },
          lenses: insight
            ? {
                house: insight.houseBody,
                naturalSign: insight.naturalLensLabel,
                naturalSignBody: insight.naturalLensBody || insight.lensBody,
                rulerThread: insight.rulerBody
              }
            : null
        },
        knowledgeIds: [placementContentId(position.planet, position.sign)],
        sourceSnapshot: {
          source: "tldrastro-you-placement-detail",
          chartId: primaryChart?.id ?? null,
          placementId: natalPlacementRouteId(position)
        },
        voiceNotes: [
          "Seed a draft for the user's natal placement detail page.",
          "Write the main interpretation only. Do not copy or restate the lens sections as separate headings.",
          "Lead with what this placement means in plain direct prose before mechanics.",
          "Use the provided house lens and ruler thread as context, but author the write-up as a coherent interpretation.",
          "Avoid vague phrases like energy, invitation, portal, lean into, the universe, journey, alignment, terrain gets processed, or makes this placement.",
          "Do not mention drafts, review status, generated content, databases, backend, or knowledge base.",
          "Keep it specific, human, and around 170 to 260 words."
        ].join("\n")
      });
    } catch (error) {
      console.warn("Natal placement write-up draft seeding failed.", error);
    }

    return null;
  };
  const openNatalAspectArticle = (aspect: SkySnapshot["aspects"][number]) => {
    setActivePlacementRouteId(null);
    setTransitArticle(natalAspectDetailArticle(aspect, generatedContent));
    if (window.location.hash.startsWith("#you/placement/")) {
      window.history.pushState(null, "", "#you");
    }
  };
  const openPlacementArticle = (position: PlanetPosition, historyMode: "push" | "replace" = "push") => {
    const placementId = natalPlacementRouteId(position);
    const contentKey = natalPlacementWriteupContentKey(position);
    const liveWriteup = placementWriteups.get(contentKey) ?? null;

    setActivePlacementRouteId(placementId);
    setTransitArticle(natalPlacementDetailArticle(position, natalSky, liveWriteup, generatedContent, openNatalAspectArticle));
    updatePlacementRouteUrl(placementId, historyMode);
    void loadOrSeedPlacementWriteup(position).then((loadedWriteup) => {
      const nextWriteup = loadedWriteup ?? placementWriteups.get(contentKey) ?? null;

      if (nextWriteup && placementRouteIdFromUrl() === placementId) {
        setTransitArticle(natalPlacementDetailArticle(position, natalSky, nextWriteup, generatedContent, openNatalAspectArticle));
      }
    });
  };
  useEffect(() => {
    function syncPlacementRoute() {
      const routeId = placementRouteIdFromUrl();
      const routePosition = placementPositionByRouteId(routeId);

      if (routePosition) {
        const contentKey = natalPlacementWriteupContentKey(routePosition);
        setActivePlacementRouteId(routeId);
        setTransitArticle(natalPlacementDetailArticle(routePosition, natalSky, placementWriteups.get(contentKey) ?? null, generatedContent, openNatalAspectArticle));
        void loadOrSeedPlacementWriteup(routePosition);
        return;
      }

      if (activePlacementRouteId) {
        setActivePlacementRouteId(null);
        setTransitArticle(null);
      }
    }

    syncPlacementRoute();
    window.addEventListener("popstate", syncPlacementRoute);
    window.addEventListener("hashchange", syncPlacementRoute);

    return () => {
      window.removeEventListener("popstate", syncPlacementRoute);
      window.removeEventListener("hashchange", syncPlacementRoute);
    };
  }, [activePlacementRouteId, generatedContent, natalSky, placementWriteups, routeableNatalPositions.map(natalPlacementRouteId).join("|")]);
  const bigThreeRows = [
    <PlacementTableRow
      degree={natalSun ? formatPlanetDegree(natalSun) : null}
      description={natalSignatureDescriptions.Sun}
      dignity={natalSun ? placementDignity(natalSun) : null}
      glyph="☉"
      house={natalSun?.house ?? null}
      onClick={natalSun ? () => openPlacementArticle(natalSun) : undefined}
      pointName="Sun"
      retrograde={natalSun?.motion === "retrograde"}
      title={natalSun ? natalPlacementSignTitle(natalSun) : displaySun ? `Sun in ${displaySun}` : "Sun calculating"}
      variant="natal"
      key="sun"
    />,
    <PlacementTableRow
      degree={natalMoon ? formatPlanetDegree(natalMoon) : null}
      description={natalSignatureDescriptions.Moon}
      dignity={natalMoon ? placementDignity(natalMoon) : null}
      glyph="☽"
      house={natalMoon?.house ?? null}
      onClick={natalMoon ? () => openPlacementArticle(natalMoon) : undefined}
      pointName="Moon"
      retrograde={natalMoon?.motion === "retrograde"}
      title={natalMoon ? natalPlacementSignTitle(natalMoon) : displayMoon ? `Moon in ${displayMoon}` : "Moon calculating"}
      variant="natal"
      key="moon"
    />,
    <PlacementTableRow
      glyph="↑"
      pointName="Ascendant"
      title={displayRising && displayRising !== "Rising pending" ? `Ascendant in ${displayRising}` : displayRising || "Rising calculating"}
      description={natalSignatureDescriptions.Ascendant}
      variant="natal"
      key="ascendant"
    />
  ];
  const planetPlacementRows = planetRows.map((position) => (
    <PlanetPlacementRow
      degree={formatPlanetDegree(position)}
      description={natalPlacementDescription(position.planet)}
      dignity={placementDignity(position)}
      glyph={position.glyph}
      house={position.house}
      key={position.planet}
      onClick={() => openPlacementArticle(position)}
      pointName={position.planet}
      retrograde={position.motion === "retrograde"}
      title={natalPlacementSignTitle(position)}
      variant="natal"
    />
  ));
  const emptyHouseRows = natalSky ? emptyNatalHouses.map((house) => {
    const houseSign = natalSky.ascendant ? signAtWholeSignHouse(natalSky.ascendant, house) : "";

    return (
      <PlacementTableRow
        description={emptyHouseDescriptions[house] ?? naturalHouseLensBodies[house] ?? null}
        glyph={houseSign ? zodiacSignGlyphs[houseSign] ?? "○" : "○"}
        house={house}
        key={`empty-house-${house}`}
        title={emptyHouseTitle(house, natalSky)}
        variant="natal"
      />
    );
  }) : [];
  const natalAspectItems = natalAspectRows.map((aspect) => {
    const contentKey = aspectContentId(aspect.from, aspect.type, aspect.to);
    const content = fallbackFromHook(
      "you.natal-aspect",
      {
        planetA: aspect.from,
        aspect: aspect.type,
        planetB: aspect.to
      },
      approvedVoiceOrKnowledgeFallback(contentKey)
    );
    const generated = liveGeneratedContent(generatedContent, contentKey);
    const rowSummary = liveGeneratedSummary(
      generated,
      content.summary || aspectRelationshipDescription(aspect.from, aspect.type, aspect.to)
    );

    return (
      <button
        aria-label={`Read more about ${aspect.from} ${aspect.type} ${aspect.to}`}
        className="aspect-row aspect-row-button"
        key={`${aspect.from}-${aspect.type}-${aspect.to}`}
        onClick={() => openNatalAspectArticle(aspect)}
        type="button"
      >
        <AspectGlyphs from={aspect.from} aspect={aspect.type} to={aspect.to} />
        <span className="aspect-row-copy">
          <h3>{aspect.from} {aspect.type} {aspect.to}</h3>
          {rowSummary ? <p>{rowSummary}</p> : null}
        </span>
        <span className="aspect-row-meta" aria-label={`${wholeDegreeOrb(aspect.orb)} orb`}>
          <span className="aspect-row-dot" aria-hidden="true" />
          <span>{wholeDegreeOrb(aspect.orb)}</span>
        </span>
      </button>
    );
  });
  const updateAspectRows = aspectRows.map((transit) => {
    const contentKey = transitNatalContentId(transit.transitPlanet, transit.aspect, transit.natalPoint);
    const personalizedContentKey = personalTransitGeneratedContentKey(transit, transitForm.chartDate);
    const content = fallbackFromHook(
      "you.transit-to-natal",
      {
        transitPlanet: transit.transitPlanet,
        aspect: transit.aspect,
        natalPoint: transit.natalPoint
      },
      approvedVoiceOrKnowledgeFallback(contentKey)
    );
    const personalizedGenerated = liveGeneratedContent(personalTransitGeneratedContent, personalizedContentKey);
    const generated = personalizedGenerated ?? liveGeneratedContent(generatedContent, contentKey);
    const rowSummary = liveGeneratedSummary(
      generated,
      content.summary || transitNote(transit.transitPlanet, transit.aspect, transit.natalPoint)
    );
    const isBackgroundUpdate = transit.significance === "low priority" || transitOrbValue(transit) >= 6;
    const timing = transitItemTimingDisplay(transit, transitForm.chartDate);
    const title = `${transit.transitPlanet} ${transit.aspect} your ${transit.natalPoint}`;
    const articleSections = generatedArticleSections(generated, content.detailParagraphs);
    const openArticle = () => {
      setSelectedTransitId(transit.id);
      setActivePlacementRouteId(null);
      setTransitArticle({
        id: personalizedContentKey,
        title,
        glyph: pointGlyph(transit.transitPlanet),
        subtitle: stripTldrPrefix(rowSummary),
        summary: stripTldrPrefix(rowSummary),
        sections: articleSections,
        meta: [
          { label: "Duration", value: timing.rangeLabel },
          { label: "Orb", value: wholeDegreeOrb(transitOrbValue(transit)) },
          { label: "Natal point", value: transit.natalPoint }
        ]
      });
    };

    return (
      <button
        type="button"
        className={`updates-aspect-row${isBackgroundUpdate ? " updates-aspect-row--background" : ""}`}
        key={transit.id}
        onClick={openArticle}
      >
        <span className="updates-aspect-row__glyphs">
          <AspectGlyphs from={transit.transitPlanet} aspect={transit.aspect} to={transit.natalPoint} />
        </span>
        <span className="updates-aspect-row__content">
          <span className="updates-aspect-row__title">
            {title}
          </span>
          <span className="updates-aspect-row__meta-line" aria-label={timing.label}>
            <span className="planet-placement-row__duration">{timing.durationLabel}</span>
            <span>{timing.rangeLabel}</span>
          </span>
          {rowSummary ? <span className="updates-aspect-row__description">{rowSummary}</span> : null}
        </span>
        <span className="updates-aspect-row__meta" aria-label={`${timing.label}, ${transit.orb} orb`}>
          <span className="updates-aspect-row__dot" aria-hidden="true" />
          <span className="updates-aspect-row__orb">{wholeDegreeOrb(transitOrbValue(transit))}</span>
        </span>
      </button>
    );
  });
  const generatedDailyHeadline = personalTimingGenerated?.headline?.trim();
  const generatedDailySummary = liveGeneratedSummaryIfPresent(personalTimingGenerated);
  const dailyUpdateSummary = generatedDailyHeadline && generatedDailySummary
    ? {
        headline: generatedDailyHeadline,
        summary: generatedDailySummary,
        keyFactors: [],
        status: "ready" as const
      }
    : personalTiming || personalTimingStatus === "loading" || personalTimingGeneratedStatus === "loading"
      ? {
          headline: "Reading the sky",
          summary: "Checking today’s transits against your chart.",
          secondary: "This usually takes a moment.",
          keyFactors: [],
          status: "loading" as const
        }
      : null;
  const personalTimingSummary = personalTiming
    ? {
        headline: personalTiming.app.headline,
        summary: personalTiming.app.summary,
        keyFactors: personalTiming.app.keyFactors,
        status: personalTimingStatus
      }
    : personalTimingStatus === "loading"
      ? {
          headline: "Calculating personal timing",
          summary: "Checking today's sky against your chart and annual profection.",
          keyFactors: [],
          status: personalTimingStatus
        }
      : null;
  const natalChart = natalSky ? (
    <div className="wheel natal-wheel chart-shell" id="wheel-natal" aria-label="Natal chart wheel">
      <div className="chart-frame">
        <SkyWheel
          positions={natalSky.positions}
          aspects={natalSky.aspects}
          ascendant={natalSky.ascendant}
          ascendantLongitude={natalSky.ascendantLongitude}
          midheavenLongitude={natalSky.midheavenLongitude}
          showHouses
          houseSignLabelStyle={houseSignLabelStyle}
          variant="natal"
        />
      </div>
    </div>
  ) : null;

  return (
    <Suspense fallback={<FeatureLoadingFallback />}>
      <YouPage
        aspectRows={updateAspectRows}
        bigThreeRows={bigThreeRows}
        dailyUpdateSummary={dailyUpdateSummary}
        displayMoon={displayMoon}
        displayRising={displayRising}
        displaySun={displaySun}
        elementalSummaryLabel={elementalSummary.label}
        elementalSummarySentence={elementalSummary.sentence}
        emptyHouseRows={emptyHouseRows}
        hasSavedBirthDetails={hasSavedBirthDetails}
        hasSavedCurrentCity={hasSavedCurrentCity}
        natalAspectRows={natalAspectItems}
        natalChart={natalChart}
        natalChartPending={!natalSky}
        onCreateChart={onCreateChart}
        onCloseTransitArticle={() => {
          setActivePlacementRouteId(null);
          setTransitArticle(null);
          updatePortalModeUrl("profile", "push");
        }}
        personalTimingSummary={personalTimingSummary}
        planetRows={planetPlacementRows}
        profileAvatarUrl={profile.avatarUrl}
        profileEmail={profile.email}
        profileName={profile.name}
        setupStepsLeft={setupStepsLeft}
        showNatalSignatures={showNatalSignatures}
        signatureBody={signatureBody}
        signatureTitle={signatureTitle}
        signaturesReady={signaturesReady}
        transitArticle={transitArticle}
        transitsDrawn={transitsDrawn}
      />
    </Suspense>
  );
}

function RelationshipApiSummary({
  mode,
  response,
  status
}: {
  mode: "synastry" | "composite";
  response: RelationshipCompareResponse | null;
  status: RelationshipCompareStatus;
}) {
  if (!response && status !== "loading") {
    return null;
  }

  const headline = response?.app.headline ?? "Calculating relationship pattern";
  const summary = response?.app.summary
    ?? "Checking synastry contacts, composite aspects, and relationship themes.";
  const keyFactors = response?.app.keyFactors ?? [];

  return (
    <section className="relationship-api-summary" aria-label={`${mode} relationship summary`}>
      <span className="eyebrow section-label">{mode === "synastry" ? "Relationship themes" : "Composite themes"}</span>
      <h3>{headline}</h3>
      <p>{summary}</p>
      {keyFactors.length > 0 && (
        <ul>
          {keyFactors.slice(0, 4).map((factor) => (
            <li key={factor}>{factor}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ManualChartsPanel({
  profile,
  currentSky,
  profileNatalSky,
  profileTransits,
  natalGeneratedContent,
  relationshipGeneratedContent,
  landingKey,
  sunriseOrbDegrees,
  chartOwnerUserId,
  chartsReady,
  onOpenDetail
}: {
  profile: UserProfile;
  currentSky: SkySnapshot;
  profileNatalSky: SkySnapshot | null;
  profileTransits: TransitItem[];
  natalGeneratedContent: GeneratedContentMap;
  relationshipGeneratedContent: GeneratedContentMap;
  landingKey: number;
  sunriseOrbDegrees: number;
  chartOwnerUserId: string;
  chartsReady: boolean;
  onOpenDetail: (detail: SkyDetail) => void;
}) {
  const [charts, setCharts] = useState<ManualChart[]>([]);
  const [form, setForm] = useState<ManualChartForm>(defaultManualChartForm);
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null);
  const [friendsMainView, setFriendsMainView] = useState<FriendsMainView>(() => initialFriendsTab());
  const [friendProfileTab, setFriendProfileTab] = useState<FriendProfileTab>("natal");
  const [relationshipChartFullscreenMode, setRelationshipChartFullscreenMode] = useState<RelationshipChartFullscreenMode | null>(null);
  const [relationshipComparisonChartId, setRelationshipComparisonChartId] = useState("self");
  const [relationshipComparisonPickerOpen, setRelationshipComparisonPickerOpen] = useState(false);
  const [relationshipCompare, setRelationshipCompare] = useState<RelationshipCompareResponse | null>(null);
  const [relationshipCompareStatus, setRelationshipCompareStatus] = useState<RelationshipCompareStatus>("idle");
  const [friendChartModalOpen, setFriendChartModalOpen] = useState(false);
  const [openChartMenuId, setOpenChartMenuId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "deleting">("loading");
  const [message, setMessage] = useState("");
  const editingChart = charts.find((chart) => chart.id === editingChartId) ?? null;
  const selectedChart = charts.find((chart) => chart.id === selectedChartId) ?? null;
  const isEventForm = form.chartType === "event";
  const formCopy = chartFormCopy[form.chartType];
  const selectedChartIsEvent = selectedChart?.chartType === "event";
  const resolvedFriendsMainView = friendsMainView === "profile" && !selectedChart ? "charts" : friendsMainView;
  const upcomingBirthday = useMemo(
    () => upcomingBirthdayChiclet(charts, currentSky.generatedAt),
    [charts, currentSky.generatedAt]
  );
  const chartSettings = normalizeChartSettings(profile.settings);
  const lifeAreaFocus = chartSettings.lifeAreaFocus;
  const houseSignLabelStyle = chartSettings.houseSignLabelStyle;
  const selectedFriendBigThree = selectedChart ? manualChartBigThree(selectedChart) : null;
  const relationshipComparisonOptions = useMemo<RelationshipComparisonOption[]>(() => {
    const selfInitials = profileInitials(profile.name, profile.email);
    const selfOption: RelationshipComparisonOption = {
      id: "self",
      displayName: "You",
      initials: selfInitials,
      subtitle: profileNatalSky ? "Your birth chart" : "Birth chart pending",
      natalChart: profileNatalSky,
      isSelf: true
    };
    const chartOptions = charts
      .filter((chart) => chart.id !== selectedChart?.id && chart.chartType !== "event")
      .map((chart) => ({
        id: chart.id,
        displayName: chart.displayName,
        initials: profileInitials(chart.displayName, chart.displayName),
        subtitle: manualChartSubtitle(chart),
        natalChart: chart.natalChart ?? null,
        isSelf: false
      }));

    return [selfOption, ...chartOptions];
  }, [charts, profile.email, profile.name, profileNatalSky, selectedChart?.id]);
  const selectedRelationshipComparison = relationshipComparisonOptions.find((option) => option.id === relationshipComparisonChartId) ?? relationshipComparisonOptions[0];
  const relationshipComparisonSky = selectedRelationshipComparison?.natalChart ?? null;
  const relationshipComparisonName = selectedRelationshipComparison?.displayName ?? "You";
  const relationshipComparisonIsSelf = selectedRelationshipComparison?.isSelf ?? true;
  const selectedSynastryContacts = selectedChart
    ? selectedChartIsEvent
      ? []
      : rankSynastryContactsByLifeAreaFocus(
        synastryContacts(
          relationshipComparisonSky,
          selectedChart,
          relationshipGeneratedContent,
          relationshipComparisonName,
          relationshipComparisonIsSelf
        ),
        lifeAreaFocus
      )
    : [];
  const selectedSynastryAspectLines: InterChartAspectLine[] = selectedSynastryContacts.slice(0, 10).map((contact) => ({
    id: contact.id,
    fromLongitude: contact.friendPoint.longitude,
    toLongitude: contact.yourPoint.longitude,
    type: contact.aspect,
    orb: contact.orb
  }));
  const selectedCompositeSky = selectedChart && !selectedChartIsEvent ? relationshipCompositeSky(relationshipComparisonSky, selectedChart) : null;
  const selectedFriendHasChartRail = friendProfileTab === "natal"
    ? Boolean(selectedChart?.natalChart)
    : selectedChartIsEvent
      ? false
      : friendProfileTab === "synastry"
      ? Boolean(selectedChart?.natalChart && relationshipComparisonSky)
      : Boolean(selectedCompositeSky);
  const selectedFriendElementalBalance = natalElementBalance(selectedChart?.natalChart?.positions ?? []);
  const selectedFriendElementalSummary = elementalBalanceSummary(selectedFriendElementalBalance);
  const selectedFriendSun = selectedChart?.natalChart?.positions.find((position) => position.planet === "Sun");
  const selectedFriendMoon = selectedChart?.natalChart?.positions.find((position) => position.planet === "Moon");
  const openFriendNatalAspectDetail = (aspect: SkySnapshot["aspects"][number]) => {
    const friendGeneratedContent = mergeGeneratedContentMaps(natalGeneratedContent, relationshipGeneratedContent);
    const article = natalAspectDetailArticle(aspect, friendGeneratedContent);
    const ownerName = selectedChart?.displayName ?? "This chart";
    const ownerKind = selectedChartIsEvent ? "chart" : "person";
    const ownerAwareCopy = (value: ReactNode) => {
      if (typeof value !== "string") {
        return value;
      }

      return natalGeneratedCopyForOwner(value, ownerName, ownerKind);
    };

    onOpenDetail({
      glyph: article.glyph || pointGlyph(aspect.from),
      kicker: "Natal aspect",
      title: article.title,
      meta: article.subtitle,
      subtitle: article.subtitle,
      compactHeader: article.compactHeader,
      bodyBeforeSections: article.bodyBeforeSections,
      body: (article.body ?? []).map(ownerAwareCopy),
      sections: article.sections.map((section) => ({
        heading: section.heading,
        body: ownerAwareCopy(section.body)
      }))
    });
  };
  const openFriendNatalPlacementDetail = (row: SocialPlacementRow) => {
    const position = selectedChart?.natalChart?.positions.find((candidate) => candidate.planet === row.label);

    if (!position || !selectedChart?.natalChart) {
      return;
    }

    const contentKey = natalPlacementWriteupContentKey(position);
    const friendGeneratedContent = mergeGeneratedContentMaps(natalGeneratedContent, relationshipGeneratedContent);
    const liveWriteup = friendGeneratedContent.get(contentKey) ?? null;

    onOpenDetail(natalPlacementSkyDetail(
      position,
      selectedChart.natalChart,
      liveWriteup,
      friendGeneratedContent,
      openFriendNatalAspectDetail,
      {
        ownerName: selectedChart.displayName,
        ownerKind: selectedChartIsEvent ? "chart" : "person"
      }
    ));
  };
  const selectedFriendSignatureTitle = selectedFriendElementalSummary.hasClearLead && selectedFriendElementalSummary.leadElement
    ? `A ${selectedFriendElementalSummary.leadElement.toLowerCase()}-led chart`
    : selectedFriendSun
      ? natalPlacementTitle(selectedFriendSun)
      : "Chart signature needs birth details";
  const selectedFriendSignatureBody = selectedFriendElementalSummary.hasClearLead && selectedFriendElementalSummary.leadElement
    ? `${selectedChart?.displayName ?? "This chart"} has a strong ${selectedFriendElementalSummary.leadElement.toLowerCase()} emphasis. That element is the first language of the chart and colors how the rest of the placements come through.`
    : selectedFriendSun
      ? `${natalPlacementTitle(selectedFriendSun)} sets the main signature, while the elements stay more evenly distributed.`
    : "Add complete birth details to read the chart's elemental balance, angles, and strongest signatures.";
  const relationshipComparisonManualChart = relationshipComparisonChartId === "self"
    ? null
    : charts.find((chart) => chart.id === relationshipComparisonChartId) ?? null;

  function selectFriendsTab(nextTab: FriendsTab, historyMode: "push" | "replace" = "push") {
    storeFriendsTab(nextTab);
    setFriendsMainView(nextTab);
    setSelectedChartId(null);
    setFriendProfileTab("natal");
    setRelationshipChartFullscreenMode(null);
    setRelationshipComparisonChartId("self");
    setRelationshipComparisonPickerOpen(false);
    setOpenChartMenuId(null);
    updateFriendsTabUrl(nextTab, historyMode);
  }

  useEffect(() => {
    const nextTab = initialFriendsTab();
    storeFriendsTab(nextTab);
    setFriendsMainView(nextTab);
    setSelectedChartId(null);
    setFriendProfileTab("natal");
    setRelationshipChartFullscreenMode(null);
    setRelationshipComparisonChartId("self");
    setRelationshipComparisonPickerOpen(false);
    setOpenChartMenuId(null);
    updateFriendsTabUrl(nextTab, "replace");
  }, [landingKey]);

  useEffect(() => {
    function handlePopState() {
      const nextTab = initialFriendsTab();
      storeFriendsTab(nextTab);
      setFriendsMainView(nextTab);
      setSelectedChartId(null);
      setFriendProfileTab("natal");
      setRelationshipChartFullscreenMode(null);
      setRelationshipComparisonPickerOpen(false);
      setOpenChartMenuId(null);
    }

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (selectedChartIsEvent && friendProfileTab !== "natal") {
      setFriendProfileTab("natal");
    }
  }, [friendProfileTab, selectedChartIsEvent]);

  useEffect(() => {
    if (!isTldrAstroApiConfigured || !selectedChart || selectedChartIsEvent) {
      setRelationshipCompare(null);
      setRelationshipCompareStatus("idle");
      return;
    }

    const personA = apiSubjectFromManualChart(selectedChart, profile.settings);
    const personB = relationshipComparisonChartId === "self"
      ? apiSubjectFromUserChart(profile, profile.charts[0], profile.settings)
      : apiSubjectFromManualChart(relationshipComparisonManualChart, profile.settings);

    if (!personA || !personB) {
      setRelationshipCompare(null);
      setRelationshipCompareStatus("idle");
      return;
    }

    let cancelled = false;
    setRelationshipCompareStatus("loading");

    compareRelationship({
      personA,
      personB,
      settings: apiSettingsFromChartSettings(profile.settings),
      includeContentFacts: true
    })
      .then((response) => {
        if (!cancelled) {
          setRelationshipCompare(response);
          setRelationshipCompareStatus("ready");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn("TLDR Astro relationship compare API failed; using local relationship rows.", error);
          setRelationshipCompare(null);
          setRelationshipCompareStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    selectedChart?.id,
    selectedChart?.birthDate,
    selectedChart?.birthTime,
    selectedChart?.birthTimeUnknown,
    selectedChart?.birthLocation?.label,
    selectedChart?.birthLocation?.timeZone,
    selectedChartIsEvent,
    relationshipComparisonChartId,
    relationshipComparisonManualChart?.id,
    relationshipComparisonManualChart?.birthDate,
    relationshipComparisonManualChart?.birthTime,
    relationshipComparisonManualChart?.birthTimeUnknown,
    relationshipComparisonManualChart?.birthLocation?.label,
    relationshipComparisonManualChart?.birthLocation?.timeZone,
    profile.id,
    profile.name,
    profile.settings,
    profile.charts[0]?.birthDate,
    profile.charts[0]?.birthTime,
    profile.charts[0]?.birthCity,
    profile.charts[0]?.birthLocation?.label,
    profile.charts[0]?.birthLocation?.timeZone
  ]);
  const circleCards = useMemo(
    () => circleFeedPreviewCards(currentSky, charts, natalGeneratedContent, lifeAreaFocus, sunriseOrbDegrees),
    [currentSky, charts, natalGeneratedContent, lifeAreaFocus, sunriseOrbDegrees]
  );
  const isLoadingCharts = status === "loading";
  const circlePreviewCharts = useMemo(
    () => {
      const personCharts = charts.filter((chart) => chart.chartType !== "event");

      return (personCharts.length > 1 ? personCharts.slice(0, 2) : personCharts.slice(0, 1)).map((chart) => ({
        id: chart.id,
        initials: profileInitials(chart.displayName, chart.displayName)
      }));
    },
    [charts]
  );
  const circleFallbackInitials = profileInitials(profile.name, profile.email);
  const friendChartListItems = useMemo(
    () => charts.map((chart) => {
      const bigThree = manualChartBigThree(chart);

      return {
        chart,
        initials: profileInitials(chart.displayName, chart.displayName),
        sun: bigThree.sun,
        moon: bigThree.moon,
        rising: bigThree.rising,
        needsBirthTime: manualChartNeedsBirthTime(chart),
        active: selectedChart?.id === chart.id
      };
    }),
    [charts, selectedChart?.id]
  );
  const birthdayChiclet = upcomingBirthday ? (
    <div className="friends-birthday-chiclet" aria-label={`${upcomingBirthday.chart.displayName}'s birthday is ${birthdayDateLabel(upcomingBirthday.date)}`}>
      <span aria-hidden="true">🎂</span>
      <strong>{upcomingBirthday.chart.displayName}'s birthday</strong>
      <span>{birthdayDateLabel(upcomingBirthday.date)}</span>
      <b>{birthdayCountdownLabel(upcomingBirthday.daysUntil)}</b>
    </div>
  ) : null;

  useEffect(() => {
    let cancelled = false;

    if (!chartsReady) {
      setStatus("loading");
      return () => {
        cancelled = true;
      };
    }

    setStatus("loading");
    listManualCharts(chartOwnerUserId)
      .then((nextCharts) => {
        if (!cancelled) {
          setCharts(nextCharts);
          setSelectedChartId((currentId) => (
            currentId && nextCharts.some((chart) => chart.id === currentId)
              ? currentId
              : null
          ));
          setMessage("");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Could not load manual charts.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setStatus("idle");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chartOwnerUserId, chartsReady]);

  useEffect(() => {
    setRelationshipComparisonPickerOpen(false);
    setRelationshipComparisonChartId((currentId) => {
      if (currentId === "self") {
        return currentId;
      }

      if (currentId === selectedChart?.id) {
        return "self";
      }

      return charts.some((chart) => chart.id === currentId) ? currentId : "self";
    });
  }, [charts, selectedChart?.id]);

  useEffect(() => {
    setRelationshipComparisonPickerOpen(false);
  }, [friendProfileTab]);

  useEffect(() => {
    if (!relationshipChartFullscreenMode) {
      return;
    }

    if (!selectedChart || selectedChartIsEvent) {
      setRelationshipChartFullscreenMode(null);
      return;
    }

    if (relationshipChartFullscreenMode === "synastry" && !(selectedChart.natalChart && relationshipComparisonSky)) {
      setRelationshipChartFullscreenMode(null);
      return;
    }

    if (relationshipChartFullscreenMode === "composite" && !selectedCompositeSky) {
      setRelationshipChartFullscreenMode(null);
    }
  }, [
    relationshipChartFullscreenMode,
    relationshipComparisonSky,
    selectedChart,
    selectedChartIsEvent,
    selectedCompositeSky
  ]);

  useEffect(() => {
    if (!openChartMenuId) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (target instanceof Element && target.closest(".manual-chart-actions, .manual-chart-overflow-menu")) {
        return;
      }

      setOpenChartMenuId(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenChartMenuId(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openChartMenuId]);

  function resetForm(nextMessage = "") {
    setForm(defaultManualChartForm);
    setEditingChartId(null);
    setMessage(nextMessage);
  }

  function openAddChartModal() {
    resetForm();
    setOpenChartMenuId(null);
    setFriendChartModalOpen(true);
  }

  function closeFriendChartModal() {
    resetForm();
    setFriendChartModalOpen(false);
  }

  function editChart(chart: ManualChart) {
    setEditingChartId(chart.id);
    setForm(manualChartFormFromChart(chart));
    setOpenChartMenuId(null);
    setMessage("");
    setFriendChartModalOpen(true);
  }

  function addBirthTime(chart: ManualChart) {
    setEditingChartId(chart.id);
    setForm({
      ...manualChartFormFromChart(chart),
      birthTime: "",
      birthTimeUnknown: false
    });
    setOpenChartMenuId(null);
    setMessage("");
    setFriendChartModalOpen(true);
  }

  function openFriendProfile(chart: ManualChart) {
    setOpenChartMenuId(null);
    setSelectedChartId(chart.id);
    setFriendProfileTab("natal");
    setRelationshipComparisonChartId("self");
    setRelationshipComparisonPickerOpen(false);
    setFriendsMainView("profile");
  }

  function updateField<Key extends keyof ManualChartForm>(key: Key, value: ManualChartForm[Key]) {
    setForm({ ...form, [key]: value });
  }

  function updateChartType(chartType: ManualChartType) {
    setForm((currentForm) => ({
      ...currentForm,
      chartType,
      relationshipType: chartType === "event" ? "friend" : currentForm.relationshipType || "friend"
    }));
  }

  async function saveManualChart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const displayName = form.displayName.trim();
    const birthDate = form.birthDate;
    const birthPlace = form.birthPlace.trim();
    const birthLocation = birthPlace
      ? form.birthLocation?.label === birthPlace
        ? withTimeZone(form.birthLocation)
        : locationFromLabel(birthPlace)
      : null;

    if (!displayName || !birthDate || !birthPlace || !birthLocation) {
      setMessage(formCopy.requiredMessage);
      return;
    }

    if (!form.birthTimeUnknown && !form.birthTime) {
      setMessage(formCopy.timeMessage);
      return;
    }

    setStatus("saving");
    setMessage("");

    try {
      const birthTimeForChart = form.birthTimeUnknown
        ? "12:00 PM"
        : twentyFourHourTimeToDisplay(form.birthTime);
      const natalChart = await getAstrodienstSky(
        birthLocation,
        zonedDateTimeToUtc(birthDate, birthTimeForChart, birthLocation.timeZone)
      );
      const [firstName = "", ...lastNameParts] = displayName.split(/\s+/);
      const input: ManualChartInput = {
        chartType: form.chartType,
        displayName,
        firstName,
        lastName: lastNameParts.join(" ") || null,
        relationshipType: form.chartType === "event" ? null : form.relationshipType || "friend",
        birthDate,
        birthTime: form.birthTimeUnknown ? null : form.birthTime,
        birthTimeUnknown: form.birthTimeUnknown,
        birthPlace: birthLocation.label,
        birthLocation,
        natalChart,
        notes: null
      };
      const savedChart = editingChartId
        ? await updateManualChart(chartOwnerUserId, editingChartId, input)
        : await createManualChart(chartOwnerUserId, input);

      setCharts((currentCharts) => {
        const nextCharts = editingChartId
          ? currentCharts.map((chart) => chart.id === savedChart.id ? savedChart : chart)
          : [...currentCharts, savedChart];

        return nextCharts.sort((first, second) => first.displayName.localeCompare(second.displayName));
      });
      setSelectedChartId(savedChart.id);
      setFriendsMainView("profile");
      setFriendProfileTab("natal");
      setRelationshipComparisonChartId("self");
      setRelationshipComparisonPickerOpen(false);
      resetForm(editingChartId ? "Chart updated." : "Chart created.");
      setFriendChartModalOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save chart.");
    } finally {
      setStatus("idle");
    }
  }

  async function removeChart(chart: ManualChart) {
    setOpenChartMenuId(null);
    setStatus("deleting");
    setMessage("");

    try {
      await deleteManualChart(chartOwnerUserId, chart.id);
      setCharts((currentCharts) => currentCharts.filter((candidate) => candidate.id !== chart.id));
      setRelationshipComparisonChartId((currentId) => currentId === chart.id ? "self" : currentId);
      setRelationshipComparisonPickerOpen(false);
      setSelectedChartId((currentId) => {
        if (currentId === chart.id) {
          selectFriendsTab("charts", "replace");
          return null;
        }

        return currentId;
      });
      if (editingChartId === chart.id) {
        resetForm();
      }
      setMessage("Chart deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete chart.");
    } finally {
      setStatus("idle");
    }
  }

  const isFriendDetailView = resolvedFriendsMainView === "profile" && Boolean(selectedChart);

  return (
    <Suspense fallback={<FeatureLoadingFallback />}>
      <FriendsPageShell
        activeView={resolvedFriendsMainView}
        detailVariant={friendProfileTab}
        isDetailView={isFriendDetailView}
        onBackToCharts={() => selectFriendsTab("charts")}
        onSelectView={(view) => selectFriendsTab(view)}
      >

      {resolvedFriendsMainView === "circle" && (
        <FriendCircleFeed
          cards={circleCards}
          fallbackInitials={circleFallbackInitials}
          isLoading={isLoadingCharts}
          previewCharts={circlePreviewCharts}
        />
      )}

      {resolvedFriendsMainView === "charts" && (
        <FriendChartsList
          birthdayChiclet={birthdayChiclet}
          charts={friendChartListItems}
          isLoading={isLoadingCharts}
          message={message}
          openChartMenuId={openChartMenuId}
          showMessage={!friendChartModalOpen}
          onAddBirthTime={addBirthTime}
          onAddChart={openAddChartModal}
          onDeleteChart={removeChart}
          onEditChart={editChart}
          onOpenChart={openFriendProfile}
          onToggleChartMenu={(chartId) => setOpenChartMenuId((currentId) => currentId === chartId ? null : chartId)}
        />
      )}

      {friendChartModalOpen && (
        <FriendChartModal
          citySearchField={(
            <CitySearchField
              label={formCopy.placeLabel}
              value={form.birthPlace}
              onChange={(value) => {
                setForm({ ...form, birthPlace: value, birthLocation: null });
              }}
              onSelect={(suggestion) => {
                setForm({ ...form, birthPlace: suggestion.label, birthLocation: suggestion });
              }}
              placeholder={formCopy.placePlaceholder}
              className="signup-city-search manual-chart-city-search add-chart-city-search"
            />
          )}
          form={form}
          formCopy={formCopy}
          isEditing={Boolean(editingChart)}
          isEventForm={isEventForm}
          isSubmitting={status === "saving" || status === "deleting"}
          message={message}
          onChartTypeChange={updateChartType}
          onClose={closeFriendChartModal}
          onFieldChange={updateField}
          onSubmit={saveManualChart}
        />
      )}
      {selectedChart && relationshipChartFullscreenMode && !selectedChartIsEvent && (
        relationshipChartFullscreenMode === "synastry" && selectedChart.natalChart && relationshipComparisonSky ? (
          <RelationshipChartFullscreen
            comparisonOptions={relationshipComparisonOptions}
            comparisonPickerOpen={relationshipComparisonPickerOpen}
            comparisonSelectedId={selectedRelationshipComparison?.id ?? "self"}
            mode="synastry"
            outerName={selectedChart.displayName}
            outerInitials={profileInitials(selectedChart.displayName, selectedChart.displayName)}
            title={`${selectedChart.displayName} × ${relationshipComparisonName} · Synastry`}
            onClose={() => {
              setRelationshipComparisonPickerOpen(false);
              setRelationshipChartFullscreenMode(null);
            }}
            onComparisonSelect={(id) => {
              setRelationshipComparisonChartId(id);
              setRelationshipComparisonPickerOpen(false);
            }}
            onComparisonToggle={() => setRelationshipComparisonPickerOpen((current) => !current)}
          >
            <SynastryWheel
              outerPositions={selectedChart.natalChart.positions}
              innerPositions={relationshipComparisonSky.positions}
              interAspects={selectedSynastryAspectLines}
              ascendant={selectedChart.natalChart.ascendant}
              ascendantLongitude={selectedChart.natalChart.ascendantLongitude}
              midheavenLongitude={selectedChart.natalChart.midheavenLongitude}
              houseSignLabelStyle={houseSignLabelStyle}
            />
          </RelationshipChartFullscreen>
        ) : relationshipChartFullscreenMode === "composite" && selectedCompositeSky ? (
          <RelationshipChartFullscreen
          comparisonOptions={relationshipComparisonOptions}
          comparisonPickerOpen={relationshipComparisonPickerOpen}
          comparisonSelectedId={selectedRelationshipComparison?.id ?? "self"}
            mode="composite"
            title={`${selectedChart.displayName} × ${relationshipComparisonName} · Composite`}
            onClose={() => {
              setRelationshipComparisonPickerOpen(false);
              setRelationshipChartFullscreenMode(null);
            }}
            onComparisonSelect={(id) => {
              setRelationshipComparisonChartId(id);
              setRelationshipComparisonPickerOpen(false);
            }}
            onComparisonToggle={() => setRelationshipComparisonPickerOpen((current) => !current)}
          >
            <SkyWheel
              positions={selectedCompositeSky.positions}
              aspects={selectedCompositeSky.aspects}
              ascendant={selectedCompositeSky.ascendant}
              ascendantLongitude={selectedCompositeSky.ascendantLongitude}
              midheavenLongitude={selectedCompositeSky.midheavenLongitude}
              showHouses
              houseSignLabelStyle={houseSignLabelStyle}
              variant="composite"
            />
          </RelationshipChartFullscreen>
        ) : null
      )}
      {resolvedFriendsMainView === "profile" && selectedChart && (
        <FriendDetail
          activeTab={friendProfileTab}
          ariaLabel={`${selectedChart.displayName} chart profile`}
          chartRail={(
            <div className="relationship-detail-left friend-detail-chart-column friend-detail-chart-rail chart-layout__visual" aria-label={selectedChartIsEvent ? "Event chart" : "Relationship chart"}>
              {friendProfileTab === "natal" && selectedChart.natalChart && (
                <div className="friend-synastry-wheel-shell">
                  <div className="chart-shell">
                    <div className="wheel natal-wheel friend-wheel chart-frame" aria-label={`${selectedChart.displayName} natal chart wheel`}>
                      <SkyWheel
                        positions={selectedChart.natalChart.positions}
                        aspects={selectedChart.natalChart.aspects}
                        ascendant={selectedChart.natalChart.ascendant}
                        ascendantLongitude={selectedChart.natalChart.ascendantLongitude}
                        midheavenLongitude={selectedChart.natalChart.midheavenLongitude}
                        showHouses
                        houseSignLabelStyle={houseSignLabelStyle}
                        variant="natal"
                      />
                    </div>
                  </div>
                </div>
              )}
              {friendProfileTab === "synastry" && selectedChart.natalChart && relationshipComparisonSky && (
                <div className="friend-synastry-wheel-shell">
                  <div className="chart-shell">
                    <div className="wheel natal-wheel friend-wheel chart-frame" aria-label={`${selectedChart.displayName} synastry chart wheel`}>
                      <SynastryWheel
                        outerPositions={selectedChart.natalChart.positions}
                        innerPositions={relationshipComparisonSky?.positions ?? []}
                        interAspects={selectedSynastryAspectLines}
                        ascendant={selectedChart.natalChart.ascendant}
                        ascendantLongitude={selectedChart.natalChart.ascendantLongitude}
                        midheavenLongitude={selectedChart.natalChart.midheavenLongitude}
                        houseSignLabelStyle={houseSignLabelStyle}
                      />
                    </div>
                  </div>
                  <RelationshipComparePicker
                    variant="synastry"
                    outerName={selectedChart.displayName}
                    outerInitials={profileInitials(selectedChart.displayName, selectedChart.displayName)}
                    options={relationshipComparisonOptions}
                    selectedId={selectedRelationshipComparison?.id ?? "self"}
                    open={relationshipComparisonPickerOpen}
                    onToggle={() => setRelationshipComparisonPickerOpen((current) => !current)}
                    onSelect={(id) => {
                      setRelationshipComparisonChartId(id);
                      setRelationshipComparisonPickerOpen(false);
                    }}
                  />
                </div>
              )}
              {friendProfileTab === "composite" && selectedCompositeSky && (
                <div className="friend-synastry-wheel-shell">
                  <div className="chart-shell">
                    <div className="wheel natal-wheel friend-wheel chart-frame" aria-label={`${selectedChart.displayName} and ${relationshipComparisonIsSelf ? "you" : relationshipComparisonName} composite chart wheel`}>
                      <SkyWheel
                        positions={selectedCompositeSky.positions}
                        aspects={selectedCompositeSky.aspects}
                        ascendant={selectedCompositeSky.ascendant}
                        ascendantLongitude={selectedCompositeSky.ascendantLongitude}
                        midheavenLongitude={selectedCompositeSky.midheavenLongitude}
                        showHouses
                        houseSignLabelStyle={houseSignLabelStyle}
                        variant="composite"
                      />
                    </div>
                  </div>
                  <RelationshipComparePicker
                    variant="composite"
                    options={relationshipComparisonOptions}
                    selectedId={selectedRelationshipComparison?.id ?? "self"}
                    open={relationshipComparisonPickerOpen}
                    onToggle={() => setRelationshipComparisonPickerOpen((current) => !current)}
                    onSelect={(id) => {
                      setRelationshipComparisonChartId(id);
                      setRelationshipComparisonPickerOpen(false);
                    }}
                  />
                </div>
              )}
            </div>
          )}
          className={`friend-profile-panel friend-focus-panel friend-profile-view friend-chart-page friend-chart-page--${friendProfileTab} chart-layout friend-detail-layout relationship-detail-layout${selectedFriendHasChartRail ? "" : " relationship-detail-no-chart"}`}
          initials={profileInitials(selectedChart.displayName, selectedChart.displayName)}
          isEventChart={selectedChartIsEvent}
          moon={selectedFriendBigThree?.moon ?? "Pending"}
          name={selectedChart.displayName}
          onEdit={() => editChart(selectedChart)}
          onTabChange={(tab) => setFriendProfileTab(tab)}
          rising={selectedFriendBigThree?.rising ?? "Rising pending"}
          sun={selectedFriendBigThree?.sun ?? "Pending"}
        >

          {friendProfileTab === "natal" && (
            <div className="friend-tab-pane friend-compat-stage friend-natal-stage" aria-label="Natal">
              <div className="friend-profile-copy-column">
                <span className="eyebrow section-label friend-section-label">{selectedChartIsEvent ? "Event chart signature" : `${selectedChart.displayName}'s signatures`}</span>
                <section className="you-signatures-card friend-signature-card" aria-label={`${selectedChart.displayName} chart signature`}>
                  <div className="you-signatures-main">
                    <h3>{selectedFriendSignatureTitle}</h3>
                    <p>{selectedFriendSignatureBody}</p>
                  </div>
                  <div className="elemental-balance" aria-label={`${selectedChart.displayName} elemental balance`}>
                    <div className="elemental-balance-head">
                      <span className="eyebrow section-label">Elemental balance</span>
                      <span>{selectedFriendElementalSummary.label}</span>
                    </div>
                    <p>{selectedFriendElementalSummary.sentence}</p>
                  </div>
                </section>
                <span className="eyebrow section-label friend-section-label">Big three</span>
                <div className="list you-aspects-list aspect-row-list friend-aspect-list friend-big-three-list" aria-label={`${selectedChart.displayName} big three`}>
                  {[
                    {
                      glyph: "☉",
                      pointName: "Sun",
                      retrograde: selectedFriendSun?.motion === "retrograde",
                      title: selectedFriendSun ? natalPlacementSignTitle(selectedFriendSun) : `Sun in ${selectedFriendBigThree?.sun ?? "pending"}`,
                      body: `${selectedChart.displayName}'s core self and vitality`
                    },
                    {
                      glyph: "☽",
                      pointName: "Moon",
                      retrograde: selectedFriendMoon?.motion === "retrograde",
                      title: selectedFriendMoon ? natalPlacementSignTitle(selectedFriendMoon) : `Moon in ${selectedFriendBigThree?.moon ?? "pending"}`,
                      body: `${selectedChart.displayName}'s inner world and what they need to feel safe`
                    },
                    {
                      glyph: "↑",
                      pointName: "Ascendant",
                      retrograde: false,
                      title: `Ascendant in ${selectedFriendBigThree?.rising ?? "pending"}`,
                      body: selectedChart.birthTimeUnknown ? "Add a birth time to confirm the rising sign." : `How ${selectedChart.displayName} meets the world and comes across`
                    }
                  ].map(({ glyph, pointName, retrograde, title, body }) => (
                    <PlacementTableRow
                      description={body}
                      glyph={glyph}
                      key={title}
                      pointName={pointName}
                      retrograde={retrograde}
                      title={title}
                      variant="friend"
                    />
                  ))}
                </div>
                {selectedChart.natalChart && (
                  <>
                    <span className="eyebrow section-label friend-section-label">{selectedChartIsEvent ? "Event placements" : `${selectedChart.displayName}'s natal placements`}</span>
                    <FriendPlacementTable
                      title={selectedChartIsEvent ? "Event placements" : `${selectedChart.displayName}'s natal placements`}
                      rows={socialPlacementRows(selectedChart.natalChart)}
                      descriptionContext={selectedChartIsEvent ? "chart" : "person"}
                      generatedContent={relationshipGeneratedContent}
                      generatedContext="natal"
                      onPlacementClick={openFriendNatalPlacementDetail}
                      ownerName={selectedChart.displayName}
                      showTitle={false}
                    />
                  </>
                )}
                {selectedChart.natalChart?.aspects.length ? (
                  <>
                    <span className="eyebrow section-label friend-section-label">Natal aspects · by strength</span>
                    <div className="list you-aspects-list aspect-row-list friend-aspect-list friend-natal-aspects-list" aria-label={`${selectedChart.displayName} natal aspects`}>
                      {selectedChart.natalChart.aspects.map((aspect) => {
                        const contentKey = aspectContentId(aspect.from, aspect.type, aspect.to);
                        const content = fallbackFromHook(
                          "you.natal-aspect",
                          {
                            planetA: aspect.from,
                            aspect: aspect.type,
                            planetB: aspect.to
                          },
                          approvedVoiceOrKnowledgeFallback(contentKey)
                        );
                        const generated = liveGeneratedContent(relationshipGeneratedContent, contentKey);
                        const rawSummary = liveGeneratedSummary(generated, content.summary);
                        const rowSummary = natalGeneratedCopyForOwner(rawSummary, selectedChart.displayName, selectedChartIsEvent ? "chart" : "person");

                        return (
                          <div
                            className="aspect-row aspect-row-static friend-aspect-row"
                            key={`${aspect.from}-${aspect.type}-${aspect.to}`}
                          >
                            <AspectGlyphs from={aspect.from} aspect={aspect.type} to={aspect.to} />
                            <span className="aspect-row-copy">
                              <h3>{aspect.from} {aspect.type} {aspect.to}</h3>
                              {rowSummary ? <p>{rowSummary}</p> : null}
                            </span>
                            <span className="aspect-row-meta" aria-label={`${wholeDegreeOrb(aspect.orb)} orb`}>
                              <span className="aspect-row-dot" aria-hidden="true" />
                              <span>{wholeDegreeOrb(aspect.orb)}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}

          {friendProfileTab === "synastry" && (
            <div className="friend-tab-pane friend-compat-stage" aria-label="Synastry">
              <div className="friend-profile-copy-column">
                <article className="relationship-explainer-card relationship-explainer-card--synastry" aria-label="What synastry shows">
                  <span className="relationship-explainer-card__glyph" aria-hidden="true">
                    <img src={zodiacAssetHref("tool-synastry.svg") ?? ""} alt="" />
                  </span>
                  <span className="relationship-explainer-card__copy">
                    <span className="relationship-explainer-card__kicker">What synastry shows</span>
                    <p>
                      Where {possessiveLabel(selectedChart.displayName)} planets meet {relationshipComparisonIsSelf ? "yours" : `${relationshipComparisonPossessive(relationshipComparisonName, relationshipComparisonIsSelf)} planets`} and what happens when they do. Why some things come easily between you and others take more work.
                    </p>
                  </span>
                </article>
                <RelationshipApiSummary
                  mode="synastry"
                  response={relationshipCompare}
                  status={relationshipCompareStatus}
                />
                <SynastryPlacementsComparison
                  outerName={selectedChart.displayName}
                  outerSky={selectedChart.natalChart}
                  innerName={relationshipComparisonName}
                  innerSky={relationshipComparisonSky}
                  innerIsSelf={relationshipComparisonIsSelf}
                />
                <span className="eyebrow section-label friend-section-label">Interaspects · by strength</span>
                <div className="list you-aspects-list aspect-row-list friend-aspect-list" aria-label={`${selectedChart.displayName} compatibility contacts`}>
                  {selectedSynastryContacts.map((contact) => {
                    const comparisonPossessive = relationshipComparisonPossessive(relationshipComparisonName, relationshipComparisonIsSelf);
                    const title = relationshipAspectTitle(selectedChart.displayName, contact.friendPoint.name, contact.aspect, comparisonPossessive, contact.yourPoint.name);
                    const subtitle = relationshipThemeTitle(contact.friendPoint.name, contact.yourPoint.name, contact.aspect);
                    const detailParagraphs = synastryDetailCopy(
                      selectedChart.displayName,
                      relationshipComparisonName,
                      relationshipComparisonIsSelf,
                      contact,
                      relationshipGeneratedContent
                    ).filter(Boolean);
                    const description = contact.summary || textPreview(detailParagraphs.join("\n\n"));

                    return (
                      <button
                        type="button"
                        className="aspect-row aspect-row-button friend-aspect-row"
                        key={contact.id}
                        aria-label={`Open full entry for ${title}`}
                        onClick={() => onOpenDetail({
                          glyph: `${pointGlyph(contact.friendPoint.name)} ${aspectGlyph(contact.aspect)} ${pointGlyph(contact.yourPoint.name)}`,
                          kicker: "Synastry",
                          title,
                          meta: `${subtitle.toUpperCase()} · ${wholeDegreeOrb(contact.orb)}`,
                          body: detailParagraphs.length > 0 ? detailParagraphs : ["Content gap: this interaspect needs authored copy."],
                          content: emptyContentFallback(contact.contentKeys[0] ?? contact.id).bundle
                        })}
                      >
                        <span className="aspect-row-glyphs" aria-hidden="true">
                          <InlineGlyphIcon fallback={contact.friendPoint.glyph} href={zodiacAssetHref(pointIconFiles[contact.friendPoint.name])} label={contact.friendPoint.name} />
                          <InlineGlyphIcon fallback={aspectGlyph(contact.aspect)} href={zodiacAssetHref(aspectIconFiles[normalizeAspectType(contact.aspect)])} label={contact.aspect} />
                          <InlineGlyphIcon fallback={contact.yourPoint.glyph} href={zodiacAssetHref(pointIconFiles[contact.yourPoint.name])} label={contact.yourPoint.name} />
                        </span>
                        <span className="aspect-row-copy">
                          <h3>{title}</h3>
                          <span className="aspect-row-subtitle">{subtitle}</span>
                          {description ? <p className="synastry-contact-description">{description}</p> : null}
                        </span>
                        <span className="aspect-row-meta" aria-label={`${wholeDegreeOrb(contact.orb)} orb`}>
                          <span className="aspect-row-dot" aria-hidden="true" />
                          <span>{wholeDegreeOrb(contact.orb)}</span>
                        </span>
                      </button>
                    );
                  })}
                  {selectedSynastryContacts.length === 0 && (
                    <article className="friends-logic-card">
                      <span>Interaspects</span>
                      <h3>Add both charts.</h3>
                      <p>Complete birth details for both people will reveal their strongest synastry contacts.</p>
                    </article>
                  )}
                </div>
              </div>
            </div>
          )}

          {friendProfileTab === "composite" && (
            <div className="friend-tab-pane friend-compat-stage" aria-label="Composite">
              <div className="friend-profile-copy-column">
                <article className="relationship-explainer-card relationship-explainer-card--composite" aria-label="What a composite chart is">
                  <span className="relationship-explainer-card__glyph" aria-hidden="true">
                    <img src={zodiacAssetHref("tool-composite.svg") ?? ""} alt="" />
                  </span>
                  <span className="relationship-explainer-card__copy">
                    <span className="relationship-explainer-card__kicker">What a composite chart is</span>
                    <p>
                      A composite chart is the relationship&apos;s own chart, built from the midpoints between two people&apos;s planets. It&apos;s read like a natal chart, but the placements describe the relationship instead of either person.
                    </p>
                  </span>
                </article>
                <RelationshipApiSummary
                  mode="composite"
                  response={relationshipCompare}
                  status={relationshipCompareStatus}
                />
                {selectedCompositeSky && (
                  <section className="composite-placements-section">
                    <span className="eyebrow section-label friend-section-label">Composite placements</span>
                    <FriendPlacementTable
                      title="Composite placements"
                      rows={socialPlacementRows(selectedCompositeSky)}
                      compact
                      descriptionContext="composite"
                      generatedContent={relationshipGeneratedContent}
                      generatedContext="composite"
                      showTitle={false}
                    />
                  </section>
                )}
                <span className="eyebrow section-label friend-section-label">Composite aspects · by strength</span>
                {selectedCompositeSky ? (
                  <div className="list you-aspects-list aspect-row-list friend-aspect-list" aria-label="Composite chart aspects">
                    {selectedCompositeSky.aspects.map((aspect) => (
                      <div className="aspect-row aspect-row-static friend-aspect-row" key={`${aspect.from}-${aspect.type}-${aspect.to}`}>
                        <AspectGlyphs from={aspect.from} aspect={aspect.type} to={aspect.to} />
                        <span className="aspect-row-copy">
                          <h3>{aspect.from} {aspect.type} {aspect.to}</h3>
                          <span className="aspect-row-subtitle">{relationshipThemeTitle(aspect.from, aspect.to, aspect.type)}</span>
                          <p>{compositeAspectSummary(aspect, selectedChart.displayName, relationshipComparisonName, relationshipComparisonIsSelf, relationshipGeneratedContent)}</p>
                        </span>
                        <span className="aspect-row-meta" aria-label={`${wholeDegreeOrb(aspect.orb)} orb`}>
                          <span className="aspect-row-dot" aria-hidden="true" />
                          <span>{wholeDegreeOrb(aspect.orb)}</span>
                        </span>
                      </div>
                    ))}
                    {selectedCompositeSky.aspects.length === 0 && (
                      <article className="friends-logic-card">
                        <span>Composite aspects</span>
                        <h3>No tight major aspects found.</h3>
                        <p>The composite chart is ready, but no single aspect is leading the relationship pattern.</p>
                      </article>
                    )}
                  </div>
                ) : (
                  <article className="friends-logic-card">
                    <span>Composite</span>
                    <h3>Composite chart needs both birth charts.</h3>
                    <p>Add complete birth data for both people to generate the composite chart view.</p>
                  </article>
                )}
              </div>
            </div>
          )}
        </FriendDetail>
      )}
      </FriendsPageShell>
    </Suspense>
  );
}
