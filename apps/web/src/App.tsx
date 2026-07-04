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
  DurationLabelText,
  FriendPlacementTable,
  InlineGlyphIcon,
  PlanetPlacementRow,
  PlacementGlyphIcon,
  PlacementTableRow,
  SynastryPlacementsComparison,
  dignitiesFor,
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
  signGlyph,
  zodiacAssetHref,
  zodiacSignIconFiles,
} from "./components/charts/chartAssets";
import { SkyWheel, SynastryWheel, type InterChartAspectLine } from "./components/charts/Wheels";
import { fallbackHookByKey, knowledgeIdsForFallbackHook, type FallbackHookContext } from "./content/fallbackHooks";
import type { ContentBundle } from "./content/types";
import type { RelationshipChartFullscreenMode } from "./features/friends/RelationshipChartFullscreen";
import type { RelationshipComparisonOption } from "./features/friends/RelationshipComparePicker";
import { SKY_BODY_ORDER, skyBodyOrderIndex, transitToNatalOrbLimit } from "./astrologyConfig";
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
  renderGeneratedContentTemplate,
  type GeneratedContentDrilldown,
  type LiveGeneratedContent
} from "./services/generatedContent";
import type { TemplateSlotValues } from "./services/templateInterpolation";
import {
  compositeAspectContentKey,
  natalAspectContentKey,
  natalHouseContentKey,
  natalRulerContentKey,
  natalSignContentKey,
  skyAspectContentKey,
  skyAspectInstanceContentKey,
  synastryAspectContentKey,
  transitToNatalAspectContentKey
} from "./services/generatedContentKeys";
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

type PortalMode = AccountMode | "member" | "profile" | "friends" | "calendar" | "account" | "settings";
type TransitTerm = "short" | "long";
type TransitDirection = "applying" | "separating";
type UiTheme = "light" | "dark";
type SignupProvider = "email" | "google";

const defaultLocation: LocationInput = {
  label: "New York City, NY",
  latitude: 40.7128,
  longitude: -74.006,
  timeZone: "America/New_York"
};

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
  routePath?: string;
  glyph: string;
  kicker: string;
  title: string;
  meta: string;
  duration?: string;
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

function isSkyDetail(value: unknown): value is SkyDetail {
  return Boolean(value && typeof value === "object" && "title" in value && "body" in value);
}

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

function liveGeneratedContent(generatedContent: GeneratedContentMap, contentKey: string, templateSlots?: TemplateSlotValues) {
  return renderGeneratedContentTemplate(generatedContent.get(contentKey), templateSlots);
}

const templateFallbackContentKeys = {
  skySeasonalCurrent: "fallback-hook/sky.seasonal-current",
  skyLunarCycle: "fallback-hook/sky.lunar-cycle",
  skyPlanetaryPlacement: "fallback-hook/sky.planetary-placement",
  skyAspectDetail: "fallback-hook/sky.aspect-detail",
  skyRetrograde: "fallback-hook/sky.retrograde",
  youNatalPlacement: "fallback-hook/you.natal-placement",
  youNatalAspect: "fallback-hook/you.natal-aspect",
  youTransitToNatal: "fallback-hook/you.transit-to-natal",
  friendsSynastryContact: "fallback-hook/friends.synastry-contact",
  friendsHouseOverlay: "fallback-hook/friends.house-overlay",
  friendsCompositeAspect: "fallback-hook/friends.composite-aspect",
  friendsCompositePlacement: "fallback-hook/friends.composite-placement",
  friendsRelationshipTiming: "fallback-hook/friends.relationship-timing",
  friendsCircleFeed: "fallback-hook/friends.circle-feed",
  settingsLifeAreaFocus: "fallback-hook/settings.life-area-focus"
} as const;

type TemplateFallbackOptions = {
  contentKey: string;
  slots: TemplateSlotValues;
  afterContentFallback?: Partial<Pick<ContentFallback, "summary" | "body" | "detailParagraphs">> | null;
};

function hasContentFallback(content?: Partial<Pick<ContentFallback, "summary" | "body" | "detailParagraphs">> | null) {
  return Boolean(content?.summary || content?.body || (content?.detailParagraphs?.length ?? 0) > 0);
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

function liveGeneratedContentByKeys(
  generatedContent: GeneratedContentMap,
  contentKeys: string[],
  templateFallback?: TemplateFallbackOptions
) {
  for (const contentKey of contentKeys) {
    const generated = liveGeneratedContent(generatedContent, contentKey, templateFallback?.slots);

    if (generated) {
      return generated;
    }
  }

  return templateFallback && !hasContentFallback(templateFallback.afterContentFallback)
    ? liveGeneratedContent(generatedContent, templateFallback.contentKey, templateFallback.slots)
    : null;
}

function generatedDetailSections(generated: LiveGeneratedContent | null) {
  return generatedContentSections(generated).map((section) => ({
    heading: cleanGeneratedSectionHeading(section.heading),
    body: cleanGeneratedSectionBody(section.body)
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
  const signedAspect = aspect as SkySnapshot["aspects"][number] & { fromSign?: string; toSign?: string };

  return [
    skyAspectInstanceContentKey(aspect.from, aspect.type, aspect.to, {
      firstSign: signedAspect.fromSign,
      secondSign: signedAspect.toSign,
      targetDate: dateKey
    }),
    skyAspectContentKey(aspect.from, aspect.type, aspect.to),
    `sky-aspect-${normalizeContentIdPart(aspect.from)}-${normalizeContentIdPart(aspect.type)}-${normalizeContentIdPart(aspect.to)}-${dateKey}`,
    currentSkyAspectContentId(aspect.from, aspect.type, aspect.to)
  ];
}

function signStyleSlot(sign: string) {
  return natalSignFallbackFrames[sign]?.quality ?? "";
}

function planetTopicSlot(planet: string) {
  return natalPlanetCoreFunction(planet);
}

function skyPlacementTemplateSlots(position: PlanetPosition): TemplateSlotValues {
  return {
    planet: position.planet,
    planetTopic: planetTopicSlot(position.planet),
    sign: position.sign,
    signStyle: signStyleSlot(position.sign)
  };
}

function skyPlacementTemplateFallbackKey(position: PlanetPosition) {
  if (position.planet === "Sun") {
    return templateFallbackContentKeys.skySeasonalCurrent;
  }

  if (position.planet === "Moon") {
    return templateFallbackContentKeys.skyLunarCycle;
  }

  if (position.motion === "retrograde") {
    return templateFallbackContentKeys.skyRetrograde;
  }

  return templateFallbackContentKeys.skyPlanetaryPlacement;
}

function aspectTemplateSlots(firstPoint: string, aspect: string, secondPoint: string): TemplateSlotValues {
  return {
    aspect: titleCase(aspect).toLowerCase(),
    planetA: firstPoint,
    planetATopic: planetTopicSlot(firstPoint),
    planetB: secondPoint,
    planetBTopic: planetTopicSlot(secondPoint)
  };
}

function skyAspectTemplateSlots(aspect: SkySnapshot["aspects"][number]): TemplateSlotValues {
  return aspectTemplateSlots(aspect.from, aspect.type, aspect.to);
}

function natalPlacementTemplateSlots(position: PlanetPosition): TemplateSlotValues {
  return {
    planet: position.planet,
    planetTopic: planetTopicSlot(position.planet),
    sign: position.sign,
    signStyle: signStyleSlot(position.sign),
    house: position.house ? ordinalHouse(position.house) : ""
  };
}

function transitToNatalTemplateSlots(transit: TransitItem): TemplateSlotValues {
  return {
    transitPlanet: transit.transitPlanet,
    transitPlanetTopic: planetTopicSlot(transit.transitPlanet),
    aspect: titleCase(transit.aspect).toLowerCase(),
    natalPoint: transit.natalPoint,
    natalPointTopic: planetTopicSlot(transit.natalPoint)
  };
}

function synastryTemplateSlots(
  personA: string,
  planetA: string,
  aspect: string,
  personB: string,
  planetB: string
): TemplateSlotValues {
  return {
    personA,
    planetA,
    planetATopic: planetTopicSlot(planetA),
    aspect: titleCase(aspect).toLowerCase(),
    personB,
    planetB,
    planetBTopic: planetTopicSlot(planetB)
  };
}

function houseOverlayTemplateSlots(
  personA: string,
  planet: string,
  personB: string,
  house: number
): TemplateSlotValues {
  return {
    personA,
    planet,
    planetTopic: planetTopicSlot(planet),
    personB,
    house: ordinalHouse(house),
    houseLifeArea: houseLifeAreas[house] ?? readableHouseTopic(house)
  };
}

function compositePlacementTemplateSlots(position: { planet: string; sign: string; house?: number | null }): TemplateSlotValues {
  return {
    planet: position.planet,
    planetTopic: planetTopicSlot(position.planet),
    sign: position.sign,
    signStyle: signStyleSlot(position.sign),
    house: position.house ? ordinalHouse(position.house) : ""
  };
}

function relationshipTimingTemplateSlots(person: string, transit: TransitItem): TemplateSlotValues {
  return {
    person,
    transitPlanet: transit.transitPlanet,
    transitPlanetTopic: planetTopicSlot(transit.transitPlanet),
    aspect: titleCase(transit.aspect).toLowerCase(),
    natalPoint: transit.natalPoint,
    natalPointTopic: planetTopicSlot(transit.natalPoint)
  };
}

function circleFeedTemplateSlots(topic: string): TemplateSlotValues {
  return { topic };
}

function lifeAreaFocusTemplateSlots(option: { label: string; description: string }): TemplateSlotValues {
  return {
    lifeArea: option.label,
    lifeAreaDescription: option.description.toLowerCase()
  };
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
    keys.add(`sky-retrograde-${normalizeContentIdPart(position.planet)}`);
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

function cleanGeneratedSectionHeading(heading: string) {
  const cleaned = heading.replace(/^\d{1,2}\s*[.\-·:]\s*/u, "").trim();

  return isLegacySkyArticleScaffoldHeading(cleaned) ? "" : cleaned;
}

function cleanGeneratedSectionBody(body: string) {
  return stripLegacySkyArticleScaffoldPrefix(stripTldrPrefix(body));
}

function normalizedArticleCopy(value: ReactNode) {
  return typeof value === "string"
    ? stripTldrPrefix(value).replace(/\s+/g, " ").trim().toLowerCase()
    : "";
}

function articleSectionFromText(heading: string, text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const body = cleanGeneratedSectionBody(normalized);
  const sentenceEnd = body.search(/[.!?](\s|$)/);
  const tldr = sentenceEnd > 30 ? body.slice(0, sentenceEnd + 1).trim() : body;

  return {
    heading: cleanGeneratedSectionHeading(heading),
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

function normalizeGeneratedDailyCopy(value: string) {
  return stripTldrPrefix(value).replace(/\s+/g, " ").trim().toLowerCase();
}

function splitGeneratedDailyBody(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => cleanGeneratedSectionBody(paragraph.trim()))
    .filter(Boolean);
}

function generatedDailyWriteupSections(generated: LiveGeneratedContent | null, summary: string | null) {
  const summaryCopy = summary ? normalizeGeneratedDailyCopy(summary) : "";
  const keepParagraph = (paragraph: string) => {
    const copy = normalizeGeneratedDailyCopy(paragraph);

    return copy.length > 0 && copy !== summaryCopy && !(summaryCopy && copy.startsWith(summaryCopy));
  };

  const sections = generatedContentSections(generated)
    .map((section) => ({
      heading: cleanGeneratedSectionHeading(section.heading),
      body: splitGeneratedDailyBody(section.body).filter(keepParagraph)
    }))
    .filter((section) => section.body.length > 0);

  if (sections.length > 0) {
    return sections;
  }

  const paragraphs = generatedContentParagraphs(generated)
    .map((paragraph) => stripTldrPrefix(paragraph))
    .filter(keepParagraph);

  return paragraphs.length > 0 ? [{ body: paragraphs }] : [];
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

type SkyLoadStatus = "loading" | "ready" | "error";

const selectedLocationStorageKey = "tldrastro:selectedLocation";
const selectedThemeStorageKey = "tldrastro:theme";
const sunriseOrbStorageKey = "tldrastro:sunriseOrb";
const dyslexiaFontStorageKey = "tldrastro:dyslexiaFont";
const houseSignLabelStyleStorageKey = "tldrastro:houseSignLabelStyle";
const userProfileStorageKey = "tldrastro:userProfile";
const portalModeStorageKey = "tldrastro:portalMode";
const friendsTabStorageKey = "tldrastro:friendsTab";
const pendingSignupStorageKey = "tldrastro:pendingSignup";
const skySnapshotSessionStoragePrefix = "tldrastro:skySnapshot";
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
const portalModes: PortalMode[] = ["guest", "member", "profile", "friends", "calendar", "account", "settings"];
const authenticatedPortalModes: PortalMode[] = ["member", "profile", "friends", "calendar", "account", "settings"];
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
    case "calendar":
      return "calendar";
    case "account":
      return "account";
    case "settings":
      return "settings";
    default:
      if (path.startsWith("sky/")) {
        return "member";
      }

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
    case "calendar":
      return "calendar";
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

function skyDetailRoutePathFromUrl() {
  try {
    const url = new URL(window.location.href);
    const { path } = friendsHashParts(url.hash);

    return path.startsWith("sky/") ? path : null;
  } catch {
    return null;
  }
}

function skyPlacementRoutePath(position: Pick<PlanetPosition, "planet">) {
  return `sky/placement/${encodeURIComponent(normalizeContentIdPart(position.planet))}`;
}

function skyRetrogradeRoutePath(position: Pick<PlanetPosition, "planet">) {
  return `sky/retrograde/${encodeURIComponent(normalizeContentIdPart(position.planet))}`;
}

function skyAspectRoutePath(aspect: Pick<SkySnapshot["aspects"][number], "from" | "type" | "to">) {
  return [
    "sky",
    "aspect",
    normalizeContentIdPart(aspect.from),
    normalizeContentIdPart(aspect.type),
    normalizeContentIdPart(aspect.to)
  ].map(encodeURIComponent).join("/");
}

function updateSkyDetailRouteUrl(routePath: string, mode: "push" | "replace" = "push") {
  try {
    const url = new URL(window.location.href);

    if (url.pathname === "/friends") {
      url.pathname = "/";
    }

    url.searchParams.delete("tab");
    url.hash = routePath;
    window.history[mode === "replace" ? "replaceState" : "pushState"]({}, "", url.toString());
  } catch {
    // URL state is an enhancement; keep the detail view usable if history is unavailable.
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

  if (urlMode === "calendar") {
    return "calendar";
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

function hasStoredSupabaseSession() {
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index) ?? "";

      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

function shouldBootstrapAuth(currentMode: PortalMode) {
  if (!isAuthConfigured) {
    return false;
  }

  if (hasStoredSupabaseSession()) {
    return true;
  }

  const urlMode = portalModeFromUrl();
  const authDependentModes: PortalMode[] = ["member", "profile", "friends", "account", "settings"];

  return authDependentModes.includes(urlMode ?? currentMode);
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

function sameLocationInput(first: LocationInput, second: LocationInput) {
  const firstTimeZone = first.timeZone ?? "";
  const secondTimeZone = second.timeZone ?? "";

  return first.label === second.label
    && first.latitude === second.latitude
    && first.longitude === second.longitude
    && firstTimeZone === secondTimeZone;
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

function skySnapshotCacheKey(location: LocationInput, date: string) {
  const resolvedLocation = withTimeZone(location);
  const latitude = Number.isFinite(resolvedLocation.latitude) ? resolvedLocation.latitude.toFixed(3) : "0";
  const longitude = Number.isFinite(resolvedLocation.longitude) ? resolvedLocation.longitude.toFixed(3) : "0";

  return `${skySnapshotSessionStoragePrefix}:${date}:${latitude}:${longitude}:${resolvedLocation.timeZone ?? ""}`;
}

function isCachedSkySnapshot(value: unknown): value is SkySnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as Partial<SkySnapshot>;

  return typeof snapshot.generatedAt === "string"
    && typeof snapshot.ascendant === "string"
    && typeof snapshot.midheaven === "string"
    && Array.isArray(snapshot.positions)
    && Array.isArray(snapshot.aspects)
    && Boolean(snapshot.location);
}

function readCachedSkySnapshot(cacheKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const saved = window.sessionStorage.getItem(cacheKey);
    const parsed = saved ? JSON.parse(saved) : null;

    return isCachedSkySnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCachedSkySnapshot(cacheKey: string, snapshot: SkySnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(cacheKey, JSON.stringify(snapshot));
  } catch {
    return;
  }
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

function formatSkyHeroTitle() {
  return "The sky today.";
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
  longitude
}: {
  planet: string;
  glyph: string;
  longitude: number;
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
    motion: "direct"
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

const socialBigThreeLabels = new Set(["Sun", "Moon", "Ascendant"]);

function isSocialBigThreeRow(row: SocialPlacementRow) {
  return socialBigThreeLabels.has(row.label);
}

function planetPositionFromSocialRow(row: SocialPlacementRow, sky: SkySnapshot): PlanetPosition | null {
  const existingPosition = sky.positions.find((position) => position.planet === row.label);

  if (existingPosition) {
    return existingPosition;
  }

  if (row.label !== "Ascendant") {
    return null;
  }

  return {
    planet: "Ascendant",
    glyph: row.glyph || pointGlyph("Ascendant"),
    sign: row.sign,
    signGlyph: zodiacGlyphText(row.sign),
    degree: row.degree,
    house: row.house ?? 1,
    motion: "direct"
  };
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

function articleTitleSignGlyph(title: string, meta = "") {
  const source = `${title} ${meta}`;
  const sign = zodiacSigns.find((candidate) => new RegExp(`\\b${candidate}\\b`, "i").test(source));

  return sign ? zodiacSignGlyphs[sign] ?? "" : "";
}

type ArticleEyebrowGlyph = {
  key: string;
  label: string;
  text?: string;
  href?: string | null;
  house?: boolean;
};

function textArticleGlyph(text: string, label = text): ArticleEyebrowGlyph | null {
  return text ? { key: `text-${label}-${text}`, label, text } : null;
}

function signArticleGlyph(sign: string): ArticleEyebrowGlyph | null {
  const normalizedSign = zodiacSigns.find((candidate) => candidate.toLowerCase() === sign.toLowerCase());

  if (!normalizedSign) {
    return null;
  }

  return {
    key: `sign-${normalizedSign}`,
    label: normalizedSign,
    text: signGlyph(normalizedSign),
    href: zodiacAssetHref(zodiacSignIconFiles[normalizedSign])
  };
}

function uniqueArticleGlyphs(glyphs: Array<ArticleEyebrowGlyph | null>) {
  const seen = new Set<string>();

  return glyphs.filter((glyph): glyph is ArticleEyebrowGlyph => {
    if (!glyph || seen.has(glyph.key)) {
      return false;
    }

    seen.add(glyph.key);
    return true;
  });
}

function articleTitleHouseToken(title: string, meta = "") {
  const match = `${title} ${meta}`.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+house\b/i);

  return match ? `${match[1]}H` : "";
}

function articleHouseToken(house: string | number) {
  const parsedHouse = typeof house === "number" ? house : Number.parseInt(house, 10);

  return Number.isFinite(parsedHouse) && parsedHouse >= 1 && parsedHouse <= 12 ? `${parsedHouse}H` : "";
}

function articlePlacementGlyphs(title: string, meta = "") {
  const source = `${title} ${meta}`;
  const match = source.match(
    /^(\w[\w\s]*?)(\s+Rx)?\s+in\s+(\w+)(?:\s+in\s+the\s+(\d+)(?:st|nd|rd|th)\s+house)?/i
  );

  if (!match) {
    return [];
  }

  const [, body, retrograde, sign, house] = match;
  return uniqueArticleGlyphs([
    textArticleGlyph(pointGlyph(body.trim()), body.trim()),
    retrograde ? textArticleGlyph("℞", "Retrograde") : null,
    signArticleGlyph(sign.trim()),
    house ? { key: `house-${house}`, label: `${house} house`, text: articleHouseToken(house), house: true } : null
  ]);
}

function articleEyebrowLabel(title: string, kicker?: string) {
  if (/\b(conjunction|opposition|square|trine|sextile|quincunx|aspect)\b/i.test(title)) {
    return "Aspect";
  }

  if (articleTitleSignGlyph(title)) {
    return "Placement";
  }

  return kicker?.trim() || "Article";
}

function articleEyebrowGlyphs({
  glyph,
  meta,
  title
}: {
  glyph?: string;
  meta?: string;
  title: string;
}) {
  const placementGlyphs = articlePlacementGlyphs(title, meta);

  if (placementGlyphs.length > 0) {
    return placementGlyphs;
  }

  const sign = zodiacSigns.find((candidate) => new RegExp(`\\b${candidate}\\b`, "i").test(`${title} ${meta}`));

  return uniqueArticleGlyphs([
    ...(glyph ? glyph.split(/\s+/).filter(Boolean).map((part) => textArticleGlyph(part)) : []),
    sign ? signArticleGlyph(sign) : null,
    articleTitleHouseToken(title, meta)
      ? { key: `house-${articleTitleHouseToken(title, meta)}`, label: articleTitleHouseToken(title, meta), text: articleTitleHouseToken(title, meta), house: true }
      : null
  ]);
}

function articleTldrText(value: string) {
  return stripTldrPrefix(value)
    .replace(/\s+/g, " ")
    .trim();
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

function formatSkyAspectDateRange(start: Date, end: Date, referenceDate = new Date()) {
  if (sameLocalDate(start, end)) {
    return sameLocalDate(start, referenceDate) ? "Today" : formatEditorialDate(start, true);
  }

  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();

  if (sameMonth) {
    return `${formatEditorialDate(start)} - ${end.getUTCDate()}, ${end.getUTCFullYear()}`;
  }

  if (sameYear) {
    return `${formatEditorialDate(start)} - ${formatEditorialDate(end)}, ${end.getUTCFullYear()}`;
  }

  return `${formatEditorialDate(start, true)} - ${formatEditorialDate(end, true)}`;
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

function differenceInCalendarDays(start: Date, end: Date) {
  return Math.max(0, Math.floor((dateOnly(end) - dateOnly(start)) / 86_400_000));
}

function daysInUtcMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function addCalendarMonths(start: Date, months: number) {
  const year = start.getUTCFullYear() + Math.floor((start.getUTCMonth() + months) / 12);
  const month = (start.getUTCMonth() + months) % 12;
  const normalizedMonth = month < 0 ? month + 12 : month;
  const normalizedYear = month < 0 ? year - 1 : year;
  const day = Math.min(start.getUTCDate(), daysInUtcMonth(normalizedYear, normalizedMonth));

  return new Date(Date.UTC(normalizedYear, normalizedMonth, day));
}

function differenceInCalendarParts(startInput: string | Date, endInput: string | Date) {
  const start = dateFromDurationInput(startInput);
  const end = dateFromDurationInput(endInput);

  if (!start || !end || end.getTime() < start.getTime()) {
    return null;
  }

  let totalMonths = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth());
  let monthAnchor = addCalendarMonths(start, totalMonths);

  if (monthAnchor.getTime() > end.getTime()) {
    totalMonths = Math.max(0, totalMonths - 1);
    monthAnchor = addCalendarMonths(start, totalMonths);
  }

  const days = differenceInCalendarDays(monthAnchor, end);

  return {
    totalDays: differenceInCalendarDays(start, end),
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days
  };
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
    return formatCountdown(startInput, endInput);
  }

  const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  return `${hours}H ${minutes}MIN left`;
}

function formatCountdown(startInput: string | Date, endInput: string | Date) {
  const parts = differenceInCalendarParts(startInput, endInput);

  if (!parts) {
    return null;
  }

  if (parts.totalDays < 1) {
    return "TODAY left";
  }

  if (parts.totalDays < 60) {
    return parts.years === 0 && parts.months === 1 && parts.days === 0
      ? "1M left"
      : `${parts.totalDays}D left`;
  }

  const segments = [
    parts.years > 0 ? `${parts.years}Y` : null,
    parts.months > 0 ? `${parts.months}M` : null,
    parts.days > 0 ? `${parts.days}D` : null
  ].filter(Boolean);

  return `${segments.length > 0 ? segments.join(" ") : `${parts.totalDays}D`} left`;
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

  return formatSkyAspectDateRange(window.start, window.end, new Date(generatedAt));
}

function fastestSkyAspectPlanet(aspect: SkySnapshot["aspects"][number]) {
  return [aspect.from, aspect.to]
    .map((planet) => ({ planet, order: skyBodyOrderIndex(planet) }))
    .filter((item) => item.order < SKY_BODY_ORDER.length)
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

function aspectRangeLabelForWindow(start: Date, end: Date, referenceDate = new Date(), includeYear = false) {
  const durationMs = Math.max(0, end.getTime() - start.getTime());
  const durationDays = durationMs / 86_400_000;

  if (sameLocalDate(start, end)) {
    return `${formatEditorialTime(start)} - ${formatEditorialTime(end)}`;
  }

  if (durationMs < 86_400_000 || durationDays < 365) {
    if (sameLocalDate(start, end)) {
      return includeYear ? formatEditorialDate(start, true) : formatEditorialDate(start);
    }

    return includeYear
      ? formatSkyAspectDateRange(start, end, referenceDate)
      : formatEditorialDateRange(start, end, referenceDate);
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function aspectTimingDisplayForWindow(start: Date, end: Date, referenceDate = new Date(), includeYear = false): AspectTimingDisplay {
  const durationLabel = aspectTimingCategoryForWindow(start, end, referenceDate);
  const rangeLabel = aspectRangeLabelForWindow(start, end, referenceDate, includeYear);

  return {
    durationLabel,
    rangeLabel,
    label: `${durationLabel} · ${rangeLabel}`
  };
}

function skyAspectTimingDisplay(aspect: SkySnapshot["aspects"][number], generatedAt: string) {
  const window = currentSkyAspectTransitWindow(aspect, generatedAt);

  return aspectTimingDisplayForWindow(window.start, window.end, new Date(generatedAt), true);
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

function isLegacySkyArticleScaffoldHeading(heading: string) {
  const normalized = heading.trim().toLowerCase().replace(/:+$/u, "");

  return [
    "tldr",
    "what you may notice",
    "what to do",
    "timing",
    "reflection",
    "integration",
    "closing",
    "closing statement",
    "planetary meaning",
    "how it may show up",
    "how to work with it",
    "home and family"
  ].includes(normalized);
}

function stripLegacySkyArticleScaffoldPrefix(text: string) {
  return text.replace(
    /^(?:TLDR|What You May Notice|What To Do|Timing|Reflection|Integration|Closing|Closing Statement|Planetary Meaning|How It May Show Up|How To Work With It|Home And Family)\s*:\s*/iu,
    ""
  ).trim();
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
    heading: cleanGeneratedSectionHeading(section.heading)
  })).map((section) => ({
    ...section,
    heading: isLegacySkyArticleScaffoldHeading(section.heading) ? "" : section.heading,
    body: typeof section.body === "string" ? cleanGeneratedSectionBody(section.body) : section.body
  }));
  const drilldown = detail.astrologyDrilldown;
  const [lede] = paragraphs;
  const detailSubtitle = detail.subtitle ? stripTldrPrefix(detail.subtitle).trim() : "";
  const articleSub = articleTldrText(detailSubtitle || statement || (typeof lede === "string" ? lede : ""));
  const fallbackParagraphs = paragraphs;
  const [bodyLede, ...bodySectionParagraphs] = fallbackParagraphs;
  const eyebrowLabel = articleEyebrowLabel(detail.title, detail.kicker);
  const eyebrowGlyphs = articleEyebrowGlyphs({
    glyph: detail.glyph,
    meta: metaRows.map((row) => row.value).join(" "),
    title: detail.title
  });
  const hasRelatedAspects = Boolean(detail.relatedAspects?.rows.length);
  const hasReadableBody = Boolean(
    detail.lensHint ||
      (detail.plainBody && fallbackParagraphs.length > 0) ||
      generatedSections.length > 0 ||
      fallbackParagraphs.length > 0 ||
      drilldown
  );
  const isAspectsOnlyArticle = hasRelatedAspects && !hasReadableBody;

  return (
    <section
      className={`article-page sky-detail-page${detail.compactHeader ? " you-transit-article-page" : ""}`}
      aria-label={`${detail.title} field guide`}
      aria-labelledby="sky-detail-title"
    >
      <button className="sky-detail-back floating-back-button" type="button" aria-label="Close detail" onClick={onClose}>
        <ChevronLeft size={18} aria-hidden="true" />
        <span>Back</span>
      </button>
      <article className={`article-shell sky-detail-article${detail.compactHeader ? " you-transit-article" : ""}`}>
        <div className={`article-card sky-detail-card${isAspectsOnlyArticle ? " sky-detail-card--aspects-only" : ""}`}>
          <header className="article-id sky-detail-id">
            <div className="article-eyebrow" aria-label={eyebrowGlyphs.length ? `${eyebrowLabel}: ${eyebrowGlyphs.map((glyph) => glyph.label).join(" ")}` : eyebrowLabel}>
              <span>{eyebrowLabel}</span>
              {eyebrowGlyphs.length ? (
                <>
                  <span className="article-eyebrow__slash" aria-hidden="true">/</span>
                  <span className="article-eyebrow__glyphs" aria-hidden="true">
                    {eyebrowGlyphs.map((glyph) => (
                      <span className={glyph.house ? "article-eyebrow__house" : glyph.href ? "article-eyebrow__icon" : undefined} key={glyph.key}>
                        {glyph.href ? <img src={glyph.href} alt="" aria-hidden="true" /> : glyph.text}
                      </span>
                    ))}
                  </span>
                </>
              ) : null}
            </div>
            <h1 className="article-title" id="sky-detail-title">{detail.title}</h1>
            {detail.duration ? (
              <p className="article-duration">{detail.duration}</p>
            ) : null}
            {articleSub ? (
              <div className="article-tldr">
                <span className="ui-pill ui-pill--neutral article-tldr__label">TLDR</span>
                <p className="article-sub article-tldr__copy">{articleSub}</p>
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
                      ? section.body.split(/\n{2,}/).map((paragraph) => stripLegacySkyArticleScaffoldPrefix(paragraph)).filter(Boolean)
                      : [];

                    return (
                      <section className="article-section sky-detail-section" key={`${section.heading || "section"}-${index}`}>
                        {section.heading ? <h3>{section.heading}</h3> : null}
                        {bodyParagraphs.length > 0
                          ? bodyParagraphs.map((paragraph, paragraphIndex) => (
                            <p key={`${section.heading || "section"}-${index}-${paragraphIndex}`}>{paragraph}</p>
                          ))
                          : <p>{typeof section.body === "string" ? stripLegacySkyArticleScaffoldPrefix(section.body) : section.body}</p>}
                      </section>
                    );
                  })}
                </>
              ) : (
                <>
                  {bodyLede ? (
                    <section className="article-section sky-detail-section">
                      <p className="sky-detail-lede">{bodyLede}</p>
                    </section>
                  ) : null}
                  {bodySectionParagraphs.map((paragraph, index) => (
                    <section className="article-section sky-detail-section" key={index}>
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

type AspectCopyContext = {
  positions?: PlanetPosition[];
  direction?: "applying" | "separating";
  timingLabel?: string;
};

function skyAspectPosition(point: string, positions?: PlanetPosition[]) {
  return positions?.find((position) => position.planet === point) ?? null;
}

function aspectHousePhrase(point: string, positions?: PlanetPosition[]) {
  const position = skyAspectPosition(point, positions);

  if (!position?.house) {
    return "";
  }

  const phrases: Record<number, string> = {
    1: "your body, mood, and first response",
    2: "money, comfort, or feeling supported",
    3: "a conversation, message, or decision",
    4: "home, family, or what helps you settle",
    5: "pleasure, dating, creativity, or what feels alive",
    6: "work rhythms, health, or daily needs",
    7: "a relationship, agreement, or one-on-one exchange",
    8: "trust, shared money, or a feeling that has more weight",
    9: "belief, study, travel, or a wider perspective",
    10: "work, reputation, or a public decision",
    11: "friends, groups, or future plans",
    12: "rest, privacy, or what is happening behind the scenes"
  };

  return phrases[position.house] ?? readableHouseTopic(position.house).replace(/^your\s+/i, "");
}

function aspectTimingNudge(context?: AspectCopyContext) {
  void context;
  return "";
}

function comparableText(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function aspectRelationshipDescription(firstPoint: string, aspect: string, secondPoint: string, context?: AspectCopyContext) {
  void firstPoint;
  void aspect;
  void secondPoint;
  void context;
  return "";
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
  const generated = liveGeneratedContentByKeys(
    generatedContent,
    [contentKey],
    {
      contentKey: templateFallbackContentKeys.youNatalAspect,
      slots: aspectTemplateSlots(aspect.from, aspect.type, aspect.to),
      afterContentFallback: content
    }
  );
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
  generatedContent: GeneratedContentMap,
  positions?: PlanetPosition[]
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
  const generated = liveGeneratedContentByKeys(
    generatedContent,
    skyAspectGeneratedContentKeys(aspect, generatedAt),
    {
      contentKey: templateFallbackContentKeys.skyAspectDetail,
      slots: skyAspectTemplateSlots(aspect),
      afterContentFallback: content
    }
  );
  const fallbackSummary = aspectRelationshipDescription(aspect.from, aspect.type, aspect.to, { positions }) || fallbackPreviewText(content);
  const rowSummary = liveGeneratedSummary(generated, fallbackSummary);
  const subtitle = stripTldrPrefix(rowSummary);
  const detailParagraphs = liveGeneratedBody(generated, content.detailParagraphs);
  const normalizedSubtitle = comparableText(subtitle);
  const body = detailParagraphs.filter((paragraph) => {
    if (typeof paragraph !== "string") {
      return true;
    }

    return comparableText(stripTldrPrefix(paragraph)) !== normalizedSubtitle;
  });
  const timing = currentSkyAspectTransitRange(aspect, generatedAt);

  return {
    routePath: skyAspectRoutePath(aspect),
    glyph: `${pointGlyph(aspect.from)} ${aspectGlyph(aspect.type)} ${pointGlyph(aspect.to)}`,
    kicker: "",
    title: generated?.headline ?? title,
    meta: `${aspectTone(aspect.type).toUpperCase()} · ${timing}`,
    duration: timing,
    subtitle,
    content: content.bundle,
    body,
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
  pointName,
  positions
}: {
  aspects: SkySnapshot["aspects"];
  generatedAt?: string;
  generatedContent: GeneratedContentMap;
  mode: "sky" | "natal";
  onOpenNatalAspect?: (aspect: SkySnapshot["aspects"][number]) => void;
  onOpenSkyAspect?: (aspect: SkySnapshot["aspects"][number]) => void;
  ownerContext?: { ownerName: string; ownerKind?: "person" | "chart" };
  pointName: string;
  positions?: PlanetPosition[];
}) {
  return aspects
    .filter((aspect) => aspect.from === pointName || aspect.to === pointName)
    .slice()
    .sort((first, second) => first.orb - second.orb)
    .slice(0, mode === "sky" ? 2 : 4)
    .map((aspect) => {
      const otherPoint = aspectOtherPoint(aspect, pointName);
      const title = `${pointName} ${titleCase(aspect.type)} ${otherPoint}`;
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
      const generated = mode === "sky" && generatedAt
        ? liveGeneratedContentByKeys(
            generatedContent,
            skyAspectGeneratedContentKeys(aspect, generatedAt),
            {
              contentKey: templateFallbackContentKeys.skyAspectDetail,
              slots: skyAspectTemplateSlots(aspect),
              afterContentFallback: fallback
            }
          )
        : liveGeneratedContentByKeys(generatedContent, [
            natalAspectContentKey(aspect.from, aspect.type, aspect.to),
            aspectContentId(aspect.from, aspect.type, aspect.to)
          ], {
            contentKey: templateFallbackContentKeys.youNatalAspect,
            slots: aspectTemplateSlots(aspect.from, aspect.type, aspect.to),
            afterContentFallback: fallback
          });
      const rowSummary = liveGeneratedSummary(
        generated,
        mode === "sky"
          ? aspectRelationshipDescription(pointName, aspect.type, otherPoint, { positions }) || fallback.summary
          : fallback.summary || aspectRelationshipDescription(pointName, aspect.type, otherPoint)
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
  const configuredOrb = transitToNatalOrbLimit(transitPosition.planet);
  const baseOrb = configuredOrb > 0 ? Math.min(definition.orb, configuredOrb) : definition.orb;

  return isSunHorizonContact ? baseOrb + sunriseOrb : baseOrb;
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

function emptyHouseTitle(house: number, natalSky: SkySnapshot | null) {
  const houseSign = natalSky?.ascendant ? signAtWholeSignHouse(natalSky.ascendant, house) : "";

  return houseSign ? `Empty ${ordinalHouse(house)} House in ${houseSign}` : `Empty ${ordinalHouse(house)} House`;
}

const emptyHouseTopicLabels: Record<number, string> = {
  1: "the self",
  2: "worth and security",
  3: "everyday perception",
  4: "home and emotional foundation",
  5: "creative life and pleasure",
  6: "daily life and maintenance",
  7: "relationship and agreement",
  8: "trust and shared resources",
  9: "meaning and perspective",
  10: "public life and responsibility",
  11: "friendship and belonging",
  12: "rest and the hidden life"
};

const emptyHouseTopicSingulars: Record<number, string> = {
  1: "identity",
  2: "sense of worth",
  3: "voice and perception",
  4: "emotional foundation",
  5: "creative life",
  6: "daily rhythm",
  7: "relationship pattern",
  8: "relationship with trust",
  9: "search for meaning",
  10: "public direction",
  11: "sense of belonging",
  12: "inner life"
};

const emptyHouseTopicKeywords: Record<number, string> = {
  1: "identity, presence, and approach to life",
  2: "money, resources, self-worth, and stability",
  3: "communication, learning, siblings, and everyday perception",
  4: "home, family, roots, privacy, and emotional foundation",
  5: "creativity, pleasure, romance, play, and personal expression",
  6: "work, health, routines, service, and daily maintenance",
  7: "partnership, attraction, agreement, and direct relationships",
  8: "trust, intimacy, shared resources, debt, and deeper change",
  9: "belief, study, travel, teaching, and wider perspective",
  10: "career, reputation, responsibility, visibility, and public role",
  11: "friends, groups, networks, shared goals, and belonging",
  12: "rest, privacy, retreat, dreams, and hidden pressure"
};

const emptyHouseCardTopics: Record<number, string> = {
  1: "identity, presence, and approach to life",
  2: "money, self-worth, and sense of stability",
  3: "communication, learning, and everyday perception",
  4: "home, family, and emotional foundation",
  5: "creativity, pleasure, and personal expression",
  6: "work, health, and daily routines",
  7: "relationships, attraction, and agreements",
  8: "trust, intimacy, and shared resources",
  9: "beliefs, study, and search for meaning",
  10: "career, reputation, and public role",
  11: "friendships, groups, and future goals",
  12: "rest, privacy, and inner life"
};

const emptyHouseCardAreaLabels: Record<number, string> = {
  1: "who you are",
  2: "security",
  3: "your voice",
  4: "home",
  5: "joy",
  6: "daily life",
  7: "relationship",
  8: "trust",
  9: "meaning",
  10: "direction",
  11: "belonging",
  12: "what is hidden"
};

const emptyHouseFriendCardAreaLabels: Record<number, string> = {
  1: "who they are",
  2: "security",
  3: "their voice",
  4: "home",
  5: "joy",
  6: "daily life",
  7: "relationship",
  8: "trust",
  9: "meaning",
  10: "direction",
  11: "belonging",
  12: "what is hidden"
};

const emptyHouseSignExpressions: Record<string, string> = {
  Aries: "direct, instinctive, brave, impatient with delay, and quick to move when something feels alive",
  Taurus: "steady, embodied, patient, protective of comfort, and drawn toward what proves itself over time",
  Gemini: "alert, observant, adaptable, curious, and responsive to whatever is changing in the room",
  Cancer: "protective, sensitive, memory-led, private, and oriented around what feels safe enough to keep",
  Leo: "warm, expressive, proud, creative, and drawn toward what lets the heart be recognized",
  Virgo: "observant, precise, practical, discerning, and attentive to what can be repaired or improved",
  Libra: "relational, aesthetic, diplomatic, comparison-minded, and aware of balance, fairness, and response",
  Scorpio: "private, intense, perceptive, selective, and aware of what is happening beneath the surface",
  Sagittarius: "restless, honest, searching, future-facing, and drawn toward the larger meaning of an experience",
  Capricorn: "measured, responsible, strategic, patient, and focused on what can hold weight over time",
  Aquarius: "future-minded, unconventional, systems-aware, independent, and interested in the wider pattern",
  Pisces: "intuitive, imaginative, porous, compassionate, and sensitive to what is felt before it is explained"
};

const emptyHouseSignBehaviorsApplied: Record<string, string> = {
  Aries: "moving first, taking initiative, and learning through direct contact with the situation",
  Taurus: "testing what feels steady, useful, pleasurable, and worth keeping",
  Gemini: "asking questions, changing perspective, naming what is happening, and gathering more information",
  Cancer: "protecting what matters, following memory, and noticing what creates emotional safety",
  Leo: "letting desire, creativity, pride, and personal warmth show more visibly",
  Virgo: "paying attention to details, refining the pattern, and noticing what needs care or correction",
  Libra: "reading contrast, noticing what feels balanced or unbalanced, and learning through relationship",
  Scorpio: "tracking what is hidden, testing trust, and paying attention to what feels emotionally true",
  Sagittarius: "following the larger question, looking for meaning, and letting experience widen the view",
  Capricorn: "taking responsibility, respecting timing, and building something solid enough to last",
  Aquarius: "questioning the inherited pattern, studying the system, and staying open to a different way forward",
  Pisces: "listening beneath the surface, making room for feeling, and noticing what cannot be forced into certainty"
};

const emptyHouseRulerSignExpressions: Record<string, string> = {
  Aries: "direct, brave, impatient with avoidance, and willing to act when something matters",
  Taurus: "steady, embodied, loyal to what has value, and careful about what is worth keeping",
  Gemini: "curious, verbal, changeable, and constantly gathering information from the immediate world",
  Cancer: "protective, receptive, memory-led, and sensitive to the difference between safety and exposure",
  Leo: "creative, warm, visible, and connected to the need for confidence and personal meaning",
  Virgo: "discerning, practical, observant, and focused on making life more workable",
  Libra: "relational, responsive, beauty-aware, and shaped by balance, fairness, and mutuality",
  Scorpio: "intense, private, honest about what is hidden, and unwilling to settle for the surface",
  Sagittarius: "searching, frank, meaning-driven, and drawn toward wider experience",
  Capricorn: "serious, disciplined, consequence-aware, and built through time and responsibility",
  Aquarius: "independent, future-minded, systems-aware, and willing to question the accepted pattern",
  Pisces: "intuitive, imaginative, emotionally porous, and sensitive to what is happening beneath the facts"
};

const emptyHouseRulerSignShortExpressions: Record<string, string> = {
  Aries: "direct action",
  Taurus: "steadiness and value",
  Gemini: "language and curiosity",
  Cancer: "care and emotional memory",
  Leo: "confidence and creative warmth",
  Virgo: "discernment and practical care",
  Libra: "relationship and balance",
  Scorpio: "emotional honesty",
  Sagittarius: "belief and wider perspective",
  Capricorn: "discipline and responsibility",
  Aquarius: "independence and future-minded thinking",
  Pisces: "imagination and sensitivity"
};

const emptyHouseRulerHouseExperiences: Record<number, string> = {
  1: "body, presence, self-definition, and the way life is met directly",
  2: "money, self-worth, appetite, security, and the resources that support a life",
  3: "conversation, writing, learning, siblings, local movement, and everyday perception",
  4: "home, family, memory, privacy, roots, and the emotional foundation underneath everything else",
  5: "creativity, pleasure, romance, children, play, and the courage to let something personal be seen",
  6: "work, health, routine, service, maintenance, and the daily habits that keep life running",
  7: "partnership, attraction, agreement, conflict, and the people met face to face",
  8: "intimacy, trust, shared money, grief, debt, and the deeper exchanges that require honesty",
  9: "belief, study, travel, teaching, spirituality, and the wider perspective built from experience",
  10: "work, public role, reputation, responsibility, and the direction a life becomes known for",
  11: "friendship, groups, networks, audience, shared goals, and the future someone wants to help build",
  12: "solitude, rest, dreams, retreat, hidden pressure, grief, and the work that happens beneath the surface"
};

const emptyHouseRulerHousePathways: Record<number, string> = {
  1: "presence and self-trust",
  2: "values, resources, and a steadier relationship with worth",
  3: "language, learning, and daily perception",
  4: "roots, privacy, family, and emotional security",
  5: "creativity, pleasure, and personal expression",
  6: "routine, work, health, and the care of daily life",
  7: "relationship, agreement, and honest exchange with others",
  8: "trust, intimacy, shared resources, and deeper emotional honesty",
  9: "belief, study, travel, and a wider view of life",
  10: "work, visibility, responsibility, and public direction",
  11: "community, friendship, collaboration, and shared purpose",
  12: "rest, retreat, spiritual repair, and private processing"
};

const emptyHouseRulerHouseShortExpressions: Record<number, string> = {
  1: "self-trust",
  2: "security and values",
  3: "language and observation",
  4: "emotional foundation",
  5: "creative expression",
  6: "daily devotion",
  7: "honest relationship",
  8: "trust and depth",
  9: "lived perspective",
  10: "visible purpose",
  11: "community and shared purpose",
  12: "private repair"
};

const emptyHouseIntegratedInterpretations: Record<number, string> = {
  1: "what makes you feel most like yourself",
  2: "what truly sustains you, what drains you, and what helps you feel safe in your own life",
  3: "which words, questions, and daily patterns actually help you understand your life",
  4: "what gives you a private foundation strong enough to live from",
  5: "what makes pleasure, creativity, and affection feel honest enough to share",
  6: "which routines support your body, your work, and your ability to stay present",
  7: "which relationships create real exchange instead of repeating old agreements",
  8: "how to handle trust, intimacy, and shared resources without losing yourself",
  9: "which beliefs can hold up when they are tested by lived experience",
  10: "what kind of work, responsibility, and visibility can carry your real values",
  11: "which friendships, communities, and future goals are worth growing toward",
  12: "what needs rest, privacy, and room to be understood before it can be explained"
};

const emptyHouseFriendIntegratedInterpretations: Record<number, string> = {
  1: "what makes them feel most like themselves",
  2: "what truly sustains them, what drains them, and what helps them feel safe in their own life",
  3: "which words, questions, and daily patterns actually help them understand their life",
  4: "what gives them a private foundation strong enough to live from",
  5: "what makes pleasure, creativity, and affection feel honest enough to share",
  6: "which routines support their body, their work, and their ability to stay present",
  7: "which relationships create real exchange instead of repeating old agreements",
  8: "how to handle trust, intimacy, and shared resources without losing themselves",
  9: "which beliefs can hold up when they are tested by lived experience",
  10: "what kind of work, responsibility, and visibility can carry their real values",
  11: "which friendships, communities, and future goals are worth growing toward",
  12: "what needs rest, privacy, and room to be understood before it can be explained"
};

const emptyHouseCardRulerHouseTopics: Record<number, string> = {
  1: "presence and self-trust",
  2: "money, values, and security",
  3: "language, learning, and everyday perception",
  4: "home, family, and emotional security",
  5: "creativity, pleasure, and self-expression",
  6: "daily habits, work rhythms, and care",
  7: "relationships, agreements, and honest exchange",
  8: "trust, intimacy, and shared resources",
  9: "shared beliefs, lived experience, and perspective",
  10: "work, visibility, and public role",
  11: "community, friendship, and shared purpose",
  12: "rest, retreat, and private processing"
};

const emptyHouseCardRulerHouseLivedExpressions: Record<number, string> = {
  1: "move through the world",
  2: "build security",
  3: "use your voice",
  4: "build a private foundation",
  5: "let yourself be seen",
  6: "care for what keeps life running",
  7: "meet other people honestly",
  8: "handle depth with honesty",
  9: "follow a wider view of life",
  10: "grow into what you are known for",
  11: "find where you belong",
  12: "listen to what happens beneath the surface"
};

const emptyHouseFriendCardRulerHouseLivedExpressions: Record<number, string> = {
  1: "move through the world",
  2: "build security",
  3: "use their voice",
  4: "build a private foundation",
  5: "let themselves be seen",
  6: "care for what keeps life running",
  7: "meet other people honestly",
  8: "handle depth with honesty",
  9: "follow a wider view of life",
  10: "grow into what they are known for",
  11: "find where they belong",
  12: "listen to what happens beneath the surface"
};

function emptyHouseSignSentence(sign: string, house: number, context: "self" | "friend") {
  const subject = context === "friend" ? "they" : "you";
  const possessive = context === "friend" ? "their" : "your";
  const topic = emptyHouseTopicSingulars[house] ?? "this topic";
  const firstHouseSubject = context === "friend" ? "they" : "you";

  if (house === 1) {
    const firstHouseSentences: Record<string, string> = {
      Aries: `With Aries rising, ${firstHouseSubject} meet life head-on. The first response is usually movement: decide, act, and learn what is true by doing.`,
      Taurus: `With Taurus rising, ${firstHouseSubject} need time to trust what is in front of ${context === "friend" ? "them" : "you"}. ${capitalizeText(possessive)} presence can feel steadier when the body has caught up with the moment.`,
      Gemini: `With Gemini rising, ${firstHouseSubject} meet the world through curiosity. Language is how ${subject} reach for the room: noticing quickly, asking questions, and changing shape as new information arrives.`,
      Cancer: `With Cancer rising, ${firstHouseSubject} meet life by sensing whether something feels safe. ${capitalizeText(possessive)} presence may open slowly, then become protective once care is involved.`,
      Leo: `With Leo rising, ${firstHouseSubject} need life to feel personal enough to care about. ${capitalizeText(possessive)} presence becomes stronger when warmth and visibility are not treated like liabilities.`,
      Virgo: `With Virgo rising, ${firstHouseSubject} notice what is off before anyone explains it. ${capitalizeText(possessive)} presence can be quiet at first, but it sharpens when something needs attention.`,
      Libra: `With Libra rising, ${firstHouseSubject} enter life through response. ${capitalizeText(possessive)} presence is shaped by the room, the other person, and the balance ${subject} are trying to understand.`,
      Scorpio: `With Scorpio rising, ${firstHouseSubject} do not give everything away at the door. ${capitalizeText(possessive)} presence can feel private because ${subject} are often reading more than ${subject} are saying.`,
      Sagittarius: `With Sagittarius rising, ${firstHouseSubject} need life to feel open enough to move. ${capitalizeText(possessive)} presence becomes clearer when there is room for honesty, distance, and a bigger question.`,
      Capricorn: `With Capricorn rising, ${firstHouseSubject} tend to arrive with care. ${capitalizeText(possessive)} presence is built through time, proof, and the slow confidence of knowing what ${subject} can handle.`,
      Aquarius: `With Aquarius rising, ${firstHouseSubject} may stand slightly outside the expected script. ${capitalizeText(possessive)} presence becomes clearer when ${subject} do not have to shrink into a role that was never built for ${context === "friend" ? "them" : "you"}.`,
      Pisces: `With Pisces rising, ${firstHouseSubject} absorb the atmosphere before choosing a shape. ${capitalizeText(possessive)} presence can feel fluid because ${subject} are often responding to what has not been said yet.`
    };

    return firstHouseSentences[sign] ?? `With ${sign || "the cusp sign"} on the 1st house cusp, ${subject} meet life through the style of that sign.`;
  }

  const sentences: Record<string, string> = {
    Aries: `With Aries on the ${ordinalHouse(house)} house cusp, ${topic} needs a direct move. ${capitalizeText(subject)} may have to start the conversation, make the first choice, or act before the whole answer is clear.`,
    Taurus: `With Taurus on the ${ordinalHouse(house)} house cusp, ${subject} may need calm, repetition, and physical proof before ${topic} feels settled. When life gets loud or rushed, familiar routines and a slower pace can help ${context === "friend" ? "them" : "you"} know what is actually worth keeping.`,
    Gemini: `With Gemini on the ${ordinalHouse(house)} house cusp, ${topic} becomes easier to understand once ${subject} can talk it through, question it, and let the story change as new information arrives.`,
    Cancer: `With Cancer on the ${ordinalHouse(house)} house cusp, ${topic} is tied to comfort, care, and the need to feel protected. When the situation feels unsettled, ${subject} may hold on tighter, pull back, or look for something familiar before making a choice.`,
    Leo: `With Leo on the ${ordinalHouse(house)} house cusp, ${topic} has to feel personal. ${capitalizeText(subject)} may need room to be seen, take pride in what ${subject} want, or choose something because it genuinely matters.`,
    Virgo: `With Virgo on the ${ordinalHouse(house)} house cusp, ${topic} becomes clearer through the details ${subject} cannot ignore. The point is not perfection; it is learning what actually makes life work better.`,
    Libra: `With Libra on the ${ordinalHouse(house)} house cusp, ${topic} often becomes visible through another person. ${capitalizeText(possessive)} work is noticing the difference between real balance and simply keeping things pleasant.`,
    Scorpio: `With Scorpio on the ${ordinalHouse(house)} house cusp, ${topic} is rarely casual. This house becomes clearer when ${subject} are honest about what is trusted, withheld, wanted, or feared.`,
    Sagittarius: `With Sagittarius on the ${ordinalHouse(house)} house cusp, ${topic} needs a wider horizon. ${capitalizeText(possessive)} understanding here grows when experience challenges the first explanation and asks for something truer.`,
    Capricorn: `With Capricorn on the ${ordinalHouse(house)} house cusp, ${topic} develops through time and consequence. This house may not reveal itself quickly, but it becomes more solid when ${subject} respect what has to be built.`,
    Aquarius: `With Aquarius on the ${ordinalHouse(house)} house cusp, ${subject} may not approach ${topic} the way other people expect. ${capitalizeText(subject)} may need freedom to question the usual rules, try a different route, or choose something because it makes sense to ${context === "friend" ? "them" : "you"}, not because it is popular.`,
    Pisces: `With Pisces on the ${ordinalHouse(house)} house cusp, ${topic} may not follow a straight line. ${capitalizeText(subject)} may need time, quiet, creativity, or a more compassionate pace before the right choice becomes clear.`
  };

  if (house === 11 && sign === "Aries") {
    return context === "friend"
      ? "With Aries on the 11th house cusp, belonging may require initiative. They may have to be the one who reaches out, starts the conversation, joins the room, or leaves the group that no longer fits. Waiting until they feel completely certain can keep them outside of the spaces they are meant to test for themselves."
      : "With Aries on the 11th house cusp, belonging may require initiative. You may have to be the one who reaches out, starts the conversation, joins the room, or leaves the group that no longer fits. Waiting until you feel completely certain can keep you outside of the spaces you are meant to test for yourself.";
  }

  if (house === 2 && sign === "Cancer") {
    return context === "friend"
      ? "With Cancer on the 2nd house cusp, their sense of worth is tied to care, comfort, and feeling like they have enough to rely on. Money may not feel separate from emotion here. When they feel unsettled, it can affect how they spend, save, protect, or hold on."
      : "With Cancer on the 2nd house cusp, your sense of worth is tied to care, comfort, and feeling like you have enough to rely on. Money may not feel separate from emotion here. When you feel unsettled, it can affect how you spend, save, protect, or hold on.";
  }

  if (house === 10 && sign === "Cancer") {
    return context === "friend"
      ? "With Cancer on the 10th house cusp, their career path may be shaped by care, familiarity, and the need to feel emotionally safe before they commit to a direction. When work feels unstable or unclear, they may hold on tighter, pull back, or look for something familiar before making a move."
      : "With Cancer on the 10th house cusp, your career path may be shaped by care, familiarity, and the need to feel emotionally safe before you commit to a direction. When work feels unstable or unclear, you may hold on tighter, pull back, or look for something familiar before making a move.";
  }

  if (house === 10 && sign === "Pisces") {
    return context === "friend"
      ? "With Pisces on the 10th house cusp, their career path may not follow a straight line. They may be drawn to work that feels creative, helpful, emotional, spiritual, or hard to define at first. They may need time to understand what kind of public role actually fits them."
      : "With Pisces on the 10th house cusp, your career path may not follow a straight line. You may be drawn to work that feels creative, helpful, emotional, spiritual, or hard to define at first. You may need time to understand what kind of public role actually fits you.";
  }

  if (house === 5 && sign === "Aquarius") {
    return context === "friend"
      ? "With Aquarius on the 5th house cusp, they may not enjoy what they are supposed to enjoy. Their creativity can be more experimental, unusual, thoughtful, or outside the usual style. They may need freedom to make something strange, personal, or different before it starts to feel like theirs."
      : "With Aquarius on the 5th house cusp, you may not enjoy what you are supposed to enjoy. Your creativity can be more experimental, unusual, thoughtful, or outside the usual style. You may need freedom to make something strange, personal, or different before it starts to feel like yours.";
  }

  if (house === 9 && sign === "Gemini") {
    return context === "friend"
      ? "With Gemini on the 9th house cusp, they may look for meaning by asking questions, comparing ideas, and talking things through. They may not hold one fixed belief forever. Their views can change when they get new information, meet different people, study something closely, or hear another side of the story."
      : "With Gemini on the 9th house cusp, you may look for meaning by asking questions, comparing ideas, and talking things through. You may not hold one fixed belief forever. Your views can change when you get new information, meet different people, study something closely, or hear another side of the story.";
  }

  return sentences[sign] ?? `With ${sign || "the cusp sign"} on the ${ordinalHouse(house)} house cusp, ${subject} meet ${topic} through the behavior of that sign.`;
}

function emptyHouseNaturalName(house: number, context: "self" | "friend") {
  const possessive = context === "friend" ? "their" : "your";
  const names: Record<number, string> = {
    1: context === "friend" ? "their rising sign" : "your rising sign",
    2: "money, worth, resources, and stability",
    3: "voice, daily life, siblings, and local environment",
    4: "home, family, roots, and private life",
    5: "creativity, pleasure, romance, and joy",
    6: "work, health, routine, and daily responsibility",
    7: "partnership, close relationships, and one-on-one dynamics",
    8: "trust, intimacy, shared resources, and emotional debt",
    9: "belief, learning, travel, and perspective",
    10: "work, reputation, public role, and direction",
    11: "friends, groups, community, and future goals",
    12: "rest, privacy, solitude, and hidden pressure"
  };

  return names[house] ?? `${possessive} ${ordinalHouse(house)} house`;
}

function emptyHouseStyleTopic(house: number, context: "self" | "friend") {
  const possessive = context === "friend" ? "their" : "your";
  const topics: Record<number, string> = {
    1: `${possessive} identity`,
    2: `${possessive} stability`,
    3: `${possessive} voice`,
    4: `${possessive} private life`,
    5: `${possessive} joy`,
    6: `${possessive} daily life`,
    7: `${possessive} relationships`,
    8: `${possessive} trust`,
    9: `${possessive} worldview`,
    10: `${possessive} direction`,
    11: `${possessive} belonging`,
    12: `${possessive} inner life`
  };

  return topics[house] ?? `${possessive} ${emptyHouseTopicSingulars[house] ?? "experience"}`;
}

function emptyHousePlanetFunction(ruler: string, context: "self" | "friend") {
  const possessive = context === "friend" ? "their" : "your";
  const functions: Record<string, string> = {
    Sun: `how ${context === "friend" ? "they" : "you"} become more fully ${context === "friend" ? "themselves" : "yourself"}`,
    Moon: `what ${possessive} body remembers and what helps ${context === "friend" ? "them" : "you"} feel cared for`,
    Mercury: `how ${context === "friend" ? "they" : "you"} think, speak, and make contact`,
    Venus: `what affects comfort, attachment, desire, and the ability to let the guard down`,
    Mars: `what makes ${context === "friend" ? "them" : "you"} move, defend, or act`,
    Jupiter: `what helps ${context === "friend" ? "them" : "you"} make life bigger, clearer, and more meaningful`,
    Saturn: `where time, structure, privacy, or permission may be needed before anything feels possible`
  };

  return functions[ruler] ?? `how this part of ${context === "friend" ? "them" : "you"} moves through life`;
}

function emptyHouseRulerGuideParagraph(house: number, sign: string, ruler: string, context: "self" | "friend") {
  const rulerLabel = displayRulerName(ruler || "the ruler");

  if (house === 2 && sign === "Cancer" && ruler === "Moon") {
    return context === "friend"
      ? "Cancer is ruled by the Moon, so the Moon is their guide here. It carries the story of what helps them feel cared for, what their body remembers, and what they need in order to feel steady."
      : "Cancer is ruled by the Moon, so the Moon is your guide here. It carries the story of what helps you feel cared for, what your body remembers, and what you need in order to feel steady.";
  }

  if (house === 10 && sign === "Cancer" && ruler === "Moon") {
    return context === "friend"
      ? "Cancer is ruled by the Moon, so the Moon shows what affects their sense of direction. It points to what helps them feel steady enough to take responsibility, be seen, and make public choices."
      : "Cancer is ruled by the Moon, so the Moon shows what affects your sense of direction. It points to what helps you feel steady enough to take responsibility, be seen, and make public choices.";
  }

  if (house === 10 && sign === "Pisces" && ruler === "Jupiter") {
    return context === "friend"
      ? "Pisces is ruled by Jupiter, so Jupiter shows what helps them build confidence in their direction and recognize what kind of work has meaning for them."
      : "Pisces is ruled by Jupiter, so Jupiter shows what helps you build confidence in your direction and recognize what kind of work has meaning for you.";
  }

  if (house === 5 && sign === "Aquarius" && ruler === "Saturn") {
    return context === "friend"
      ? "Aquarius is ruled by Saturn, so Saturn shows what can make joy easier or harder to access. For them, pleasure may not be automatic. They may need time, structure, privacy, or permission before they let themselves create, play, flirt, or be seen."
      : "Aquarius is ruled by Saturn, so Saturn shows what can make joy easier or harder to access. For you, pleasure may not be automatic. You may need time, structure, privacy, or permission before you let yourself create, play, flirt, or be seen.";
  }

  if (house === 12) {
    return context === "friend"
      ? `${sign || "The cusp sign"} is ruled by ${rulerLabel}, so ${rulerLabel} shows what helps private pressure move somewhere useful. It points to the situations that make rest possible, and the ones that make it harder for them to let down.`
      : `${sign || "The cusp sign"} is ruled by ${rulerLabel}, so ${rulerLabel} shows what helps private pressure move somewhere useful. It points to the situations that make rest possible, and the ones that make it harder for you to let down.`;
  }

  return `${sign || "The cusp sign"} is ruled by ${rulerLabel}, so ${rulerLabel} is the planet to follow here. It shows ${emptyHousePlanetFunction(ruler, context)} and where ${emptyHouseNaturalName(house, context)} starts to matter in ordinary life.`;
}

function emptyHouseNeedPhrase(house: number, context: "self" | "friend") {
  const possessive = context === "friend" ? "their" : "your";
  const phrases: Record<number, string> = {
    1: `${possessive} ability to show up honestly`,
    2: `${possessive} money, support, self-worth, and sense of stability`,
    3: `${possessive} ability to think clearly and say what needs saying`,
    4: `${possessive} ability to feel rooted and private`,
    5: `${possessive} ability to enjoy, create, and be seen`,
    6: `${possessive} ability to keep daily life workable`,
    7: `${possessive} ability to meet people directly`,
    8: `${possessive} ability to trust, share, and be honest about what is heavy`,
    9: `${possessive} beliefs, studies, travel plans, teaching, and sense of direction`,
    10: `${possessive} work, reputation, public choices, and sense of direction`,
    11: `${possessive} ability to find people, groups, and goals that fit`,
    12: `${possessive} ability to rest, retreat, and process what has been carried privately`
  };

  return phrases[house] ?? `${possessive} relationship with this topic`;
}

function emptyHouseHarderPhrase(house: number, context: "self" | "friend") {
  const object = context === "friend" ? "them" : "you";
  const subject = context === "friend" ? "they" : "you";
  const phrases: Record<number, string> = {
    1: `${object} feel visible or self-possessed`,
    2: `${object} feel steady with money, resources, or self-worth`,
    3: `${object} find the words or trust what ${subject} notice`,
    4: `${object} relax at home or feel safe in private`,
    5: `${object} create, play, flirt, or be seen without turning everything into a test`,
    6: `${object} keep up with work, health, and the basic rhythm of the day`,
    7: `${object} trust a relationship or say what the agreement really is`,
    8: `${object} talk about trust, shared money, grief, or emotional debt`,
    9: `${object} trust a belief, plan, trip, or wider direction`,
    10: context === "friend"
      ? "them know what role fits, what responsibility is theirs, or what they want to be known for"
      : "you know what role fits, what responsibility is yours, or what you want to be known for",
    11: `${object} know where ${subject} belong`,
    12: `${object} rest, sleep, or admit what has been held alone`
  };

  return phrases[house] ?? `${object} know what to do next`;
}

function emptyHouseRulerHousePhrase(house: number, context: "self" | "friend") {
  const phrases: Record<number, string> = {
    1: context === "friend" ? "the way they enter a room and respond first" : "the way you enter a room and respond first",
    2: context === "friend" ? "what helps them feel supported and steady" : "what helps you feel supported and steady",
    3: context === "friend" ? "the words, questions, and daily exchanges that shape their thinking" : "the words, questions, and daily exchanges that shape your thinking",
    4: context === "friend" ? "home, family, and the private ground they return to" : "home, family, and the private ground you return to",
    5: context === "friend" ? "what lets them create, enjoy, and take up space" : "what lets you create, enjoy, and take up space",
    6: context === "friend" ? "the condition of their workday, body, and routines" : "the condition of your workday, body, and routines",
    7: context === "friend" ? "the people they meet directly and the agreements they make with them" : "the people you meet directly and the agreements you make with them",
    8: context === "friend" ? "trust, shared burdens, and what they carry with other people" : "trust, shared burdens, and what you carry with other people",
    9: context === "friend" ? "the questions that pull them beyond what they were handed" : "the questions that pull you beyond what you were handed",
    10: context === "friend" ? "the work they become known for and the role they are still building" : "the work you become known for and the role you are still building",
    11: context === "friend" ? "the groups, friendships, and shared futures that give their ideas somewhere to go" : "the groups, friendships, and shared futures that give your ideas somewhere to go",
    12: context === "friend" ? "what they carry privately or need time alone to sort through" : "what you carry privately or need time alone to sort through"
  };

  return phrases[house] ?? "the part of life where the ruler lives";
}

function emptyHouseRulerHouseConcreteSentence(house: number, context: "self" | "friend") {
  const sentences: Record<number, string> = {
    1: context === "friend"
      ? "This may show up through how they enter a room, introduce themselves, respond first, or make decisions about who they are becoming."
      : "This may show up through how you enter a room, introduce yourself, respond first, or make decisions about who you are becoming.",
    2: context === "friend"
      ? "This may show up through what they can afford, what they save, what they spend on, and what helps them feel like they have enough."
      : "This may show up through what you can afford, what you save, what you spend on, and what helps you feel like you have enough.",
    3: context === "friend"
      ? "This may show up through how they speak, what they write, what they ask, how they learn, and the daily conversations that keep shaping their thinking."
      : "This may show up through how you speak, what you write, what you ask, how you learn, and the daily conversations that keep shaping your thinking.",
    4: context === "friend"
      ? "This may show up through where they feel at home, what they keep private, and the family patterns or obligations they carry behind closed doors."
      : "This may show up through where you feel at home, what you keep private, and the family patterns or obligations you carry behind closed doors.",
    5: context === "friend"
      ? "This may show up through what they make, how they flirt, what they enjoy, how they date, or what they create before they judge it."
      : "This may show up through what you make, how you flirt, what you enjoy, how you date, or what you create before you judge it.",
    6: context === "friend"
      ? "This may show up through workload, schedule, health habits, chores, errands, and the small tasks that keep life running."
      : "This may show up through workload, schedule, health habits, chores, errands, and the small tasks that keep life running.",
    7: context === "friend"
      ? "This may show up through who they choose, how they argue, how they repair, what they expect from partners, and what they avoid saying directly."
      : "This may show up through who you choose, how you argue, how you repair, what you expect from partners, and what you avoid saying directly.",
    8: context === "friend"
      ? "This may show up through shared bills, debt, trust, grief, secrets, vulnerability, or what they carry with other people."
      : "This may show up through shared bills, debt, trust, grief, secrets, vulnerability, or what you carry with other people.",
    9: context === "friend"
      ? "This may show up through what they study, what changes their mind, where they travel, what they teach, or what they refuse to inherit without question."
      : "This may show up through what you study, what changes your mind, where you travel, what you teach, or what you refuse to inherit without question.",
    10: context === "friend"
      ? "This may show up through work, reputation, public responsibility, leadership, and the role they are building over time."
      : "This may show up through work, reputation, public responsibility, leadership, and the role you are building over time.",
    11: context === "friend"
      ? "This may show up through friends, group chats, communities, audiences, collaborators, and the people they build with or leave behind."
      : "This may show up through friends, group chats, communities, audiences, collaborators, and the people you build with or leave behind.",
    12: context === "friend"
      ? "This may show up through sleep, privacy, burnout, recovery, guilt, avoidance, and what they need before they can relax."
      : "This may show up through sleep, privacy, burnout, recovery, guilt, avoidance, and what you need before you can relax."
  };

  return sentences[house] ?? "";
}

function emptyHouseRulerSignSentence(sign: string, context: "self" | "friend") {
  const subject = context === "friend" ? "they" : "you";
  const object = context === "friend" ? "them" : "you";
  const sentences: Record<string, string> = {
    Aries: context === "friend"
      ? "They may think quickly and speak directly. They may need honest conversations more than polished ones."
      : "You may think quickly and speak directly. You may need honest conversations more than polished ones.",
    Taurus: `It may need time, proof, and a pace the body can trust.`,
    Gemini: `It may become clearer when ${subject} can question it, name it, and keep the conversation moving.`,
    Cancer: `It may be shaped by the need for care, familiarity, and emotional steadiness.`,
    Leo: `It may need ${object} to take ${context === "friend" ? "their" : "your"} own point of view seriously.`,
    Virgo: context === "friend"
      ? "They may hold back if they think it has to be useful, polished, correct, or worth showing."
      : "You may hold back if you think it has to be useful, polished, correct, or worth showing.",
    Libra: `It may become easier to understand through other people and the balance a relationship requires.`,
    Scorpio: `It may ask for honesty about what is trusted, feared, wanted, or withheld.`,
    Sagittarius: `It may need enough room to test an idea against real experience.`,
    Capricorn: `It may develop slowly, through effort that proves what can actually last.`,
    Aquarius: `It may need enough distance to question the pattern instead of simply living inside it.`,
    Pisces: `It may need quiet, imagination, and room for what cannot be explained right away.`
  };

  return sentences[sign] ?? "";
}

function emptyHouseRulerPlacementParagraph(
  house: number,
  ruler: string,
  rulerPosition: PlanetPosition | null,
  context: "self" | "friend"
) {
  const owner = context === "friend" ? "Their" : "Your";
  const rulerName = ruler || "ruler";

  if (!rulerPosition?.house) {
    return `${owner} ${rulerName} placement shows where this part of ${context === "friend" ? "their" : "your"} chart becomes easier to see.`;
  }

  if (house === 1 && rulerName === "Mercury" && rulerPosition.sign === "Aquarius" && rulerPosition.house === 9) {
    return context === "friend"
      ? `Their Mercury is in Aquarius, in the 9th house. Their identity is tied to the questions that pull them beyond what they were handed. They may come to know themselves through the ideas they test, the beliefs they outgrow, and the perspective they build from experience.`
      : `Your Mercury is in Aquarius, in the 9th house. Your identity is tied to the questions that pull you beyond what you were handed. You may come to know yourself through the ideas you test, the beliefs you outgrow, and the perspective you build from experience.`;
  }

  if (house === 1 && rulerName === "Mercury" && rulerPosition.sign === "Pisces" && rulerPosition.house === 10) {
    return context === "friend"
      ? `Their Mercury is in Pisces, in the 10th house. Their identity is tied to their work, their reputation, and the role they are still building. They come to know themselves through their voice, their sensitivity, the path they walk in the world, and the way others recognize what they bring.`
      : `Your Mercury is in Pisces, in the 10th house. Your identity is tied to your work, your reputation, and the role you are still building. You come to know yourself through your voice, your sensitivity, the path you walk in the world, and the way others recognize what you bring.`;
  }

  if (house === 12 && rulerPosition.house === 8) {
    return context === "friend"
      ? `Their ${rulerName} is in ${rulerPosition.sign}, in the 8th house. Their private life is tied to trust, shared burdens, and the emotional weight they carry with other people. They may need time, consistency, and real trust before they can fully let down.`
      : `Your ${rulerName} is in ${rulerPosition.sign}, in the 8th house. Your private life is tied to trust, shared burdens, and the emotional weight you carry with other people. You may need time, consistency, and real trust before you can fully let down.`;
  }

  if (house === 2 && rulerPosition.house === 6) {
    return context === "friend"
      ? `Their ${rulerName} is in ${rulerPosition.sign}, in the 6th house. Their sense of stability is tied to work, routines, health, and the way their daily needs are handled. They may feel more secure when their days are manageable, their body is not being ignored, and their workload is not quietly draining them.`
      : `Your ${rulerName} is in ${rulerPosition.sign}, in the 6th house. Your sense of stability is tied to work, routines, health, and the way your daily needs are handled. You may feel more secure when your days are manageable, your body is not being ignored, and your workload is not quietly draining you.`;
  }

  if (house === 10 && rulerName === "Moon" && rulerPosition.sign === "Scorpio" && rulerPosition.house === 2) {
    return context === "friend"
      ? "Their Moon is in Scorpio, in the 2nd house. This ties their work and reputation to money, self-worth, resources, and what makes them feel secure. They may think carefully about what they can afford, what they need to protect, and whether a role actually supports their stability. With Scorpio here, there can also be a need to be honest about fear, control, trust, and what they are holding back."
      : "Your Moon is in Scorpio, in the 2nd house. This ties your work and reputation to money, self-worth, resources, and what makes you feel secure. You may think carefully about what you can afford, what you need to protect, and whether a role actually supports your stability. With Scorpio here, there can also be a need to be honest about fear, control, trust, and what you are holding back.";
  }

  if (house === 11 && rulerPosition.house === 9) {
    return context === "friend"
      ? `Their ${rulerName} is in ${rulerPosition.sign}, in the 9th house. Their friendships, groups, and future goals are tied to belief, learning, travel, teaching, and the wider view they build for themselves. They may find their people through ideas that challenge the usual script, or through spaces where difference is not treated like a problem to solve.`
      : `Your ${rulerName} is in ${rulerPosition.sign}, in the 9th house. Your friendships, groups, and future goals are tied to belief, learning, travel, teaching, and the wider view you build for yourself. You may find your people through ideas that challenge the usual script, or through spaces where difference is not treated like a problem to solve.`;
  }

  if (house === 10 && rulerName === "Jupiter" && rulerPosition.sign === "Leo" && rulerPosition.house === 3) {
    return context === "friend"
      ? "Their Jupiter is in Leo, in the 3rd house. This ties career and public direction to voice, ideas, writing, teaching, and daily communication. They may become more visible through what they explain, create, teach, or share with the people around them. With Jupiter in Leo, they may need to take their own point of view seriously. Their direction may become clearer when they stop hiding their ideas and let themselves be seen as someone with something to say."
      : "Your Jupiter is in Leo, in the 3rd house. This ties career and public direction to voice, ideas, writing, teaching, and daily communication. You may become more visible through what you explain, create, teach, or share with the people around you. With Jupiter in Leo, you may need to take your own point of view seriously. Your direction may become clearer when you stop hiding your ideas and let yourself be seen as someone with something to say.";
  }

  if (house === 5 && rulerName === "Saturn" && rulerPosition.sign === "Virgo" && rulerPosition.house === 12) {
    return context === "friend"
      ? "Their Saturn is in Virgo, in the 12th house. This ties creativity and pleasure to private pressure, overthinking, rest, solitude, and the way they criticize themselves when no one else is watching. They may hold back from creating because they think it has to be useful, polished, correct, or worth showing."
      : "Your Saturn is in Virgo, in the 12th house. This ties creativity and pleasure to private pressure, overthinking, rest, solitude, and the way you criticize yourself when no one else is watching. You may hold back from creating because you think it has to be useful, polished, correct, or worth showing.";
  }

  if (house === 9 && rulerName === "Mercury" && rulerPosition.sign === "Aries" && rulerPosition.house === 7) {
    return context === "friend"
      ? "Their Mercury is in Aries, in the 7th house. This connects their worldview to close relationships, direct conversations, arguments, agreements, and the people they meet one-on-one. They may learn a lot through debate, partnership, disagreement, or having someone challenge what they thought was true. With Mercury in Aries, they may think quickly and speak directly. They may need honest conversations more than polished ones. Their beliefs may become clearer when they stop waiting for everyone to agree and say what they actually think."
      : "Your Mercury is in Aries, in the 7th house. This connects your worldview to close relationships, direct conversations, arguments, agreements, and the people you meet one-on-one. You may learn a lot through debate, partnership, disagreement, or having someone challenge what you thought was true. With Mercury in Aries, you may think quickly and speak directly. You may need honest conversations more than polished ones. Your beliefs may become clearer when you stop waiting for everyone to agree and say what you actually think.";
  }

  const topic = emptyHouseStyleTopic(house, context);
  const rulerHousePhrase = emptyHouseRulerHousePhrase(rulerPosition.house, context);
  const rulerSignSentence = emptyHouseRulerSignSentence(rulerPosition.sign, context);
  const concreteSentence = emptyHouseRulerHouseConcreteSentence(rulerPosition.house, context);

  return context === "friend"
    ? `Their ${rulerName} is in ${rulerPosition.sign}, in the ${ordinalHouse(rulerPosition.house)} house. ${capitalizeText(topic)} may become easier to read through ${rulerHousePhrase}. ${concreteSentence} ${rulerSignSentence}`
    : `Your ${rulerName} is in ${rulerPosition.sign}, in the ${ordinalHouse(rulerPosition.house)} house. ${capitalizeText(topic)} may become easier to read through ${rulerHousePhrase}. ${concreteSentence} ${rulerSignSentence}`;
}

function emptyHouseActivationParagraph(house: number, ruler: string, context: "self" | "friend") {
  const possessive = context === "friend" ? "their" : "your";
  const rulerLabel = displayRulerName(ruler || "the ruler");
  const housePhrase = house === 1
    ? context === "friend" ? "their rising sign" : "your rising sign"
    : `${possessive} ${ordinalHouse(house)} house`;
  const behavior = emptyHouseActivationBehavior(house, context);

  return `This house can stay quiet for stretches of time. When ${rulerLabel} is activated, or when planets move through ${housePhrase}, ${behavior}`;
}

function emptyHouseActivationBehavior(house: number, context: "self" | "friend") {
  const isFriend = context === "friend";
  const subject = isFriend ? "they" : "you";
  const possessive = isFriend ? "their" : "your";

  const behaviors: Record<number, string> = {
    1: isFriend
      ? "they may become more aware of how they enter a room. They may change how they dress, speak more directly, or notice how quickly other people respond to their presence."
      : "you may become more aware of how you enter a room. You may change how you dress, speak more directly, or notice how quickly other people respond to your presence.",
    2: isFriend
      ? "money and self-worth can move to the front. They may look more closely at what they can afford, what they actually need, where they are overextending themselves, or what no longer feels worth keeping."
      : "money and self-worth can move to the front. You may look more closely at what you can afford, what you actually need, where you are overextending yourself, or what no longer feels worth keeping.",
    3: isFriend
      ? "they may need to say the thing, send the message, ask the question, or follow up on a detail that keeps returning to mind."
      : "you may need to say the thing, send the message, ask the question, or follow up on a detail that keeps returning to mind.",
    4: isFriend
      ? "home and family may need a direct response. They may need privacy, a clearer boundary, a repaired routine, or a more honest relationship with the place they return to."
      : "home and family may need a direct response. You may need privacy, a clearer boundary, a repaired routine, or a more honest relationship with the place you return to.",
    5: isFriend
      ? "questions around joy, romance, creativity, and visibility may come forward. They may need to stop editing the life out of something before it has a chance to become interesting."
      : "questions around joy, romance, creativity, and visibility may come forward. You may need to stop editing the life out of something before it has a chance to become interesting.",
    6: isFriend
      ? "their schedule, body, or workload may ask for attention. They may change a habit, book the appointment, ask for help, or admit that the current rhythm is not working."
      : "your schedule, body, or workload may ask for attention. You may change a habit, book the appointment, ask for help, or admit that the current rhythm is not working.",
    7: isFriend
      ? "a relationship may need clearer terms. They may define an agreement, name what feels unequal, or decide who gets direct access to them."
      : "a relationship may need clearer terms. You may define an agreement, name what feels unequal, or decide who gets direct access to you.",
    8: isFriend
      ? "trust, shared money, or emotional debt may need to be named. They may talk about what is owed, admit what feels too heavy, or decide what they no longer want to carry alone."
      : "trust, shared money, or emotional debt may need to be named. You may talk about what is owed, admit what feels too heavy, or decide what you no longer want to carry alone.",
    9: isFriend
      ? "questions about belief, learning, travel, teaching, or direction may come forward. They may study something seriously, plan a trip, speak more openly about what they believe, or realize an old idea no longer fits."
      : "questions about belief, learning, travel, teaching, or direction may come forward. You may study something seriously, plan a trip, speak more openly about what you believe, or realize an old idea no longer fits.",
    10: isFriend
      ? "questions about work, reputation, and direction may come forward. They may need to decide what they want to be known for, what kind of work actually supports them, or what role no longer feels worth carrying."
      : "questions about work, reputation, and direction may come forward. You may need to decide what you want to be known for, what kind of work actually supports you, or what role no longer feels worth carrying.",
    11: isFriend
      ? "their relationship to groups and belonging may ask for action. They may reach out first, speak up in a group, leave a circle that no longer fits, or follow a belief that puts them in contact with different people."
      : "your relationship to groups and belonging may ask for action. You may reach out first, speak up in a group, leave a circle that no longer fits, or follow a belief that puts you in contact with different people.",
    12: isFriend
      ? "what they have been carrying privately may need space. They may pull back, sleep more, cancel an obligation, name a quiet fear, or realize they need solitude before they can explain what is happening."
      : "what you have been carrying privately may need space. You may pull back, sleep more, cancel an obligation, name a quiet fear, or realize you need solitude before you can explain what is happening."
  };

  return behaviors[house] ?? `${possessive} relationship to this topic becomes easier to see through what ${subject} choose next.`;
}

function emptyHouseCardSignBehavior(sign: string, house: number, context: "self" | "friend") {
  const subject = context === "friend" ? "they" : "you";
  const object = context === "friend" ? "them" : "you";
  const behaviors: Record<string, string> = {
    Aries: "by acting before the whole answer is clear",
    Taurus: "through familiar routines, physical comfort, and what holds up under pressure",
    Gemini: house === 1 ? "by asking questions and reading the room quickly" : "by talking it through and letting the story change",
    Cancer: `through care, comfort, and what helps ${object} feel settled`,
    Leo: "when it feels personal enough to care about",
    Virgo: "by noticing what needs to be handled, simplified, or repaired",
    Libra: "through the balance a relationship reveals",
    Scorpio: "through what is trusted, withheld, or finally named",
    Sagittarius: context === "friend" ? "by testing what they believe against real experience" : "by testing what you believe against real experience",
    Capricorn: "through what has to be built slowly",
    Aquarius: "by stepping back far enough to see the pattern",
    Pisces: "through what is felt before it can be explained"
  };

  return behaviors[sign] ?? `the way ${subject} respond to that sign`;
}

function emptyHouseCardRulerHouseLife(house: number, context: "self" | "friend") {
  const lives: Record<number, string> = {
    1: context === "friend" ? "the way they enter a room" : "the way you enter a room",
    2: context === "friend" ? "what helps them feel supported" : "what helps you feel supported",
    3: context === "friend" ? "the words and questions they keep returning to" : "the words and questions you keep returning to",
    4: context === "friend" ? "the private ground they return to" : "the private ground you return to",
    5: context === "friend" ? "what lets them create and take up space" : "what lets you create and take up space",
    6: context === "friend" ? "the condition of their daily life" : "the condition of your daily life",
    7: context === "friend" ? "the people they meet directly" : "the people you meet directly",
    8: context === "friend" ? "what they carry with other people" : "what you carry with other people",
    9: context === "friend" ? "the beliefs they are willing to test" : "the beliefs you are willing to test",
    10: context === "friend" ? "the role they grow into publicly" : "the role you grow into publicly",
    11: context === "friend" ? "the future they imagine with other people" : "the future you imagine with other people",
    12: context === "friend" ? "what they process in private" : "what you process in private"
  };

  return lives[house] ?? "the part of life where the ruler sits";
}

function emptyHouseCardAreaFocus(house: number) {
  const areas: Record<number, string> = {
    1: "who you are",
    2: "security",
    3: "your voice",
    4: "home",
    5: "joy",
    6: "daily life",
    7: "connection",
    8: "trust",
    9: "direction",
    10: "public direction",
    11: "belonging",
    12: "what is hidden"
  };

  return areas[house] ?? "this part of life";
}

function topicTakesShapeClause(topic: string, owner: "your" | "their") {
  const plural = /,|\band\b/.test(topic);
  return `${capitalizeText(owner)} ${topic} ${plural ? "take" : "takes"} shape`;
}

function displayRulerName(ruler: string) {
  if (ruler === "Moon" || ruler === "Sun") {
    return `the ${ruler}`;
  }

  return ruler;
}

function emptyHouseContext(
  house: number,
  natalSky: SkySnapshot | null
) {
  const sign = natalSky?.ascendant ? signAtWholeSignHouse(natalSky.ascendant, house) : "";
  const ruler = sign ? traditionalSignRulers[sign] ?? "" : "";
  const rulerPosition = ruler ? natalSky?.positions.find((candidate) => candidate.planet === ruler) ?? null : null;

  return { sign, ruler, rulerPosition };
}

function emptyHouseCardDescription(
  house: number,
  natalSky: SkySnapshot | null,
  context: "self" | "friend" = "self",
  ownerName?: string
) {
  const { sign, ruler, rulerPosition } = emptyHouseContext(house, natalSky);
  const rulerLabel = displayRulerName(ruler || "the house ruler");
  const topic = emptyHouseTopicSingulars[house] ?? emptyHouseCardAreaLabels[house] ?? "this topic";
  const rulerHouseLabel = rulerPosition?.house ? `the ${ordinalHouse(rulerPosition.house)} house` : "its placement";
  const rulerHouseTopics = rulerPosition?.house ? emptyHouseCardRulerHouseTopics[rulerPosition.house] ?? "the place where the ruler sits" : "where that planet lives";
  const rulerHouseLife = rulerPosition?.house ? emptyHouseCardRulerHouseLife(rulerPosition.house, context) : "where that planet lives";
  const areaFocus = emptyHouseCardAreaFocus(house);

  if (house === 2 && sign === "Cancer" && ruler === "Moon" && rulerPosition?.house === 6) {
    return context === "friend"
      ? "Their money, self-worth, and stability are connected to the Moon in the 6th house. They may feel more secure when their routines are steady, their work life is manageable, and their daily needs are being cared for."
      : "Your money, self-worth, and stability are connected to the Moon in the 6th house. You may feel more secure when your routines are steady, your work life is manageable, and your daily needs are being cared for.";
  }

  if (house === 10 && sign === "Pisces" && ruler === "Jupiter" && rulerPosition?.sign === "Leo" && rulerPosition.house === 3) {
    return context === "friend"
      ? "Their career path may not follow a straight line. With Pisces on the empty 10th house and Jupiter in Leo in the 3rd, their direction may become clearer through speaking, writing, teaching, storytelling, or sharing their ideas more openly. They may need to trust their voice before they know what role fits."
      : "Your career path may not follow a straight line. With Pisces on the empty 10th house and Jupiter in Leo in the 3rd, your direction may become clearer through speaking, writing, teaching, storytelling, or sharing your ideas more openly. You may need to trust your voice before you know what role fits.";
  }

  if (context === "friend") {
    const friendArea = areaFocus.replace(/^your\b/i, "their");
    return `${topicTakesShapeClause(topic, "their")} through ${rulerLabel} in ${rulerHouseLabel}, so ${friendArea} becomes clearer through ${rulerHouseTopics} and the way they experience ${rulerHouseLife}.`;
  }

  return `${topicTakesShapeClause(topic, "your")} through ${rulerLabel} in ${rulerHouseLabel}, so ${areaFocus} becomes clearer through ${rulerHouseTopics} and the way you experience ${rulerHouseLife}.`;
}

function emptyHouseDetailArticle(
  house: number,
  natalSky: SkySnapshot | null,
  context: "self" | "friend" = "self",
  ownerName?: string
): YouTransitArticle {
  const { sign, ruler, rulerPosition } = emptyHouseContext(house, natalSky);
  const title = emptyHouseTitle(house, natalSky);
  const rulerLabel = displayRulerName(ruler || "the house ruler");
  const emptyHouseHint = "Everyone has all 12 houses. An empty house means no natal planets sit there. It still operates, but it may have less pull and may not feel like a constant focus in your life. To understand it, look at the sign on the cusp and the planet that rules that sign. A birth chart can describe a pattern before it feels obvious. This area may become clearer when its ruler is activated or when current planets move through it.";
  const paragraphs = context === "friend"
    ? [
        emptyHouseSignSentence(sign, house, context),
        emptyHouseRulerGuideParagraph(house, sign, ruler, context),
        emptyHouseRulerPlacementParagraph(house, ruler, rulerPosition, context),
        emptyHouseActivationParagraph(house, ruler, context)
      ].filter(Boolean)
    : [
        emptyHouseSignSentence(sign, house, context),
        emptyHouseRulerGuideParagraph(house, sign, ruler, context),
        emptyHouseRulerPlacementParagraph(house, ruler, rulerPosition, context),
        emptyHouseActivationParagraph(house, ruler, context)
      ].filter(Boolean);

  return {
    id: `empty-house-${house}-${normalizeContentIdPart(sign || "unknown")}`,
    title,
    glyph: sign ? zodiacSignGlyphs[sign] ?? "○" : "○",
    subtitle: `${ordinalHouse(house)} House`,
    lensHint: emptyHouseHint,
    compactHeader: true,
    plainBody: true,
    bodyBeforeSections: true,
    body: paragraphs,
    summary: "",
    summaryHeading: "",
    sections: [],
    meta: [
      { label: "House", value: `${ordinalHouse(house)} House` },
      { label: "Sign", value: sign },
      { label: "Ruler", value: ruler },
      { label: "Ruler placement", value: rulerPosition?.house ? `${rulerPosition.sign} · ${ordinalHouse(rulerPosition.house)} House` : "" }
    ]
  };
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

function profectionHeaderLine(timing: FriendTimingContext | null) {
  if (!timing?.profectedHouse || !timing.profectedSign || !timing.lordOfYear) {
    return null;
  }

  return `Profection year · ${timing.profectedHouse}H ${timing.profectedSign} · Lord of the Year: ${timing.lordOfYear}`;
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
      longitude: natalSky.ascendantLongitude
    }),
    positionFromLongitude({
      planet: "Descendant",
      glyph: pointGlyph("Descendant"),
      longitude: natalSky.ascendantLongitude + 180
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
    const keywordScore = lifeAreaFocusScore(`${position.planet} ${position.sign} ${houseLifeAreas[position.house] ?? ""}`, [area]);

    return score + houseScore + planetScore + keywordScore;
  }, 0);
}

const skyPlacementPlanetOrder = [...SKY_BODY_ORDER];

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

    return skyBodyOrderIndex(first.planet) - skyBodyOrderIndex(second.planet);
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

    return skyBodyOrderIndex(firstFastestPlanet ?? "") - skyBodyOrderIndex(secondFastestPlanet ?? "");
  });
}

function skyAspectLifeAreaScore(aspect: SkySnapshot["aspects"][number], positions: PlanetPosition[], area: LifeAreaFocus) {
  const astrology = lifeAreaFocusAstrology[area];
  const firstPosition = positions.find((position) => position.planet === aspect.from);
  const secondPosition = positions.find((position) => position.planet === aspect.to);
  const houseScore = [firstPosition?.house, secondPosition?.house].filter((house) => house && astrology.houses.includes(house)).length * 8;
  const planetScore = [aspect.from, aspect.to].filter((planet) => astrology.planets.includes(planet)).length * 3;
  const aspectScore = astrology.aspects?.includes(aspect.type) ? 1 : 0;
  const keywordScore = lifeAreaFocusScore(`${aspect.from} ${aspect.type} ${aspect.to} ${firstPosition?.sign ?? ""} ${secondPosition?.sign ?? ""}`, [area]);

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
  const content = fallbackFromHook(
    "you.transit-to-natal",
    {
      transitPlanet: transit.transitPlanet,
      aspect: transit.aspect,
      natalPoint: transit.natalPoint,
      topic: area
    }
  );
  const generated = generatedContent
    ? liveGeneratedContentByKeys(
        generatedContent,
        transitToNatalGeneratedContentKeys(transit),
        {
          contentKey: templateFallbackContentKeys.youTransitToNatal,
          slots: transitToNatalTemplateSlots(transit),
          afterContentFallback: content
        }
      )
    : null;

  return liveGeneratedSummary(generated, content.summary);
}

function transitToNatalGeneratedContentKeys(transit: TransitItem) {
  return [
    transitToNatalAspectContentKey(transit.transitPlanet, transit.aspect, transit.natalPoint),
    transitNatalContentId(transit.transitPlanet, transit.aspect, transit.natalPoint)
  ];
}

function relationshipAspectContentKeys(firstPoint: string, aspect: string, secondPoint: string, context?: "synastry" | "composite") {
  const baseKey = aspectContentId(firstPoint, aspect, secondPoint, "relationship");
  const reversedBaseKey = aspectContentId(secondPoint, aspect, firstPoint, "relationship");
  const prefixes = context ? [context, "relationship"] : ["relationship", "synastry", "composite"];
  const keys = new Set<string>();

  if (context === "synastry") {
    keys.add(synastryAspectContentKey(firstPoint, aspect, secondPoint));
  } else if (context === "composite") {
    keys.add(compositeAspectContentKey(firstPoint, aspect, secondPoint));
  } else {
    keys.add(synastryAspectContentKey(firstPoint, aspect, secondPoint));
    keys.add(compositeAspectContentKey(firstPoint, aspect, secondPoint));
  }

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

function sentenceList(items: string[]) {
  return readableNameList(items.filter(Boolean));
}

function natalPositionsInHouse(natalSky: SkySnapshot | null, house: number) {
  return (natalSky?.positions ?? []).filter((position) => position.house === house);
}

function profectionHouseMeaning(house: number) {
  const meanings: Record<number, string> = {
    1: "A 1st house year brings attention back to the person themselves: their body, choices, energy, and the way they are entering a new chapter. This is usually not about one dramatic event. It is more often about noticing that the old way of showing up does not quite fit anymore.",
    2: "A 2nd house year brings attention to security, money, resources, values, and what helps someone feel steady. This is usually not about one dramatic event. It is more often about practical choices becoming personal because worth, comfort, and survival are closer to the surface.",
    3: "A 3rd house year brings life into the daily mind. Conversations, messages, siblings, neighbors, errands, learning, and the details of ordinary life can start carrying more weight. The year can show where the usual pace, tone, or information flow needs adjustment.",
    4: "A 4th house year turns attention toward home, family, roots, memory, and the private foundation underneath everything else. This is usually not only about what other people can see. It is more often about whether life feels safe, settled, and emotionally livable behind the scenes.",
    5: "A 5th house year brings attention to pleasure, creativity, romance, children, and the need to feel alive. This is usually not just about having fun. It can show where someone has become disconnected from wanting, playing, making, or being seen in a way that feels honest.",
    6: "A 6th house year brings attention to routines, work, health, maintenance, and the small habits that decide how sustainable life feels. The pressure is often practical, but it can affect the whole body when the daily load has become too much.",
    7: "A 7th house year brings relationships into sharper focus. Agreements, attraction, conflict, partnership, and one-to-one dynamics may ask for clearer terms than before. The year can show where another person is no longer background noise.",
    8: "An 8th house year brings attention to trust, shared resources, debt, intimacy, dependency, fear, and the parts of life people do not always discuss openly. This is rarely casual, but it does not have to be dramatic. It often shows where something needs more honesty and less avoidance.",
    9: "A 9th house year widens the frame. Belief, study, travel, teaching, publishing, and the search for meaning may become more important, especially when old answers stop feeling large enough. The year can show where someone needs a bigger reason for what they are doing.",
    10: "A 10th house year brings attention to career, visibility, reputation, responsibility, and the direction someone is building toward. More may be asked of them publicly or professionally, and the outside world may notice the pressure before they say much about it.",
    11: "An 11th house year brings attention to friends, groups, networks, community, and the future someone wants to belong to. It can clarify which circles still feel alive and which ones no longer fit.",
    12: "A 12th house year turns the volume down on the outside world and turns the volume up on what is happening internally. It can coincide with privacy, retreat, fatigue, hidden pressure, endings, and things that need time before they can be explained."
  };

  return meanings[house] ?? `A ${ordinalHouse(house)} house year can bring ${houseLifeAreas[house] ?? "the house topic"} into focus in ways that take time to understand.`;
}

function houseRealLifeQuestion(house: number) {
  const questions: Record<number, string> = {
    1: "Can I still move through life as the same version of myself?",
    2: "Does this actually support my stability, or am I carrying it out of habit?",
    3: "Is the way I am communicating, learning, and moving through daily life still working?",
    4: "Does home, family, or private life still feel safe enough to build from?",
    5: "Where did joy, desire, play, or creative risk become harder to access?",
    6: "Is this routine sustainable, or is the body starting to keep score?",
    7: "Are the terms of this relationship, agreement, or conflict still honest?",
    8: "Can I trust what I am sharing, owing, merging with, or depending on?",
    9: "Is this belief, plan, or direction still large enough for the life I am living now?",
    10: "Is this responsibility, role, or public direction still worth the weight it asks me to carry?",
    11: "Do these friendships, groups, and future plans still feel like places I can belong?",
    12: "What needs rest, privacy, or release before it can make sense?"
  };

  return questions[house] ?? "Is this topic working, or is it starting to ask for more attention?";
}

function houseRealLifeSummary(house: number) {
  const summaries: Record<number, string> = {
    1: "how they are showing up, what their body is telling them, and whether they still recognize the role they have been playing",
    2: "money, stability, self-worth, comfort, and the practical choices that make them feel secure or exposed",
    3: "messages, decisions, siblings, local movement, learning, and the details that keep shaping the day",
    4: "home, family, privacy, memory, and the emotional base they are trying to live from",
    5: "pleasure, creativity, romance, children, and the part of life that needs to feel wanted rather than only managed",
    6: "work, health, routines, stress, and the small obligations that can quietly become too heavy",
    7: "partnership, conflict, attraction, agreements, and the people they have to meet directly",
    8: "trust, shared money, intimacy, debt, vulnerability, and the things that are hard to control alone",
    9: "belief, study, travel, distance, teaching, and the larger meaning behind their choices",
    10: "work, visibility, reputation, responsibility, and the role other people expect them to hold",
    11: "friendship, groups, community, belonging, and the future they are trying to build with other people",
    12: "rest, privacy, endings, hidden pressure, and what they may be processing before they can explain it"
  };

  return summaries[house] ?? houseLifeAreas[house] ?? "the house topic";
}

function plainPlanetTopic(planet: string) {
  const topics: Record<string, string> = {
    Ascendant: "how they come across and how quickly other people can read them",
    Descendant: "the kind of people and conflicts that pull them into direct relationship",
    Sun: "energy, confidence, identity, and the need to feel respected",
    Moon: "mood, safety, memory, and private reactions",
    Mercury: "messages, decisions, questions, and the way they explain things",
    Venus: "affection, pleasure, values, and what feels worth choosing",
    Mars: "urgency, anger, desire, courage, and the impulse to act",
    Jupiter: "growth, confidence, belief, and the sense that more is possible",
    Saturn: "pressure, limits, commitment, and what has to become more realistic",
    Uranus: "restlessness, change, and the need for more room",
    Neptune: "longing, confusion, hope, and the places where reality feels harder to pin down",
    Pluto: "control, intensity, fear, and the need to stop pretending something is small",
    "North Node": "direction, repetition, and a pattern that feels important right now",
    "True Node": "direction, repetition, and a pattern that feels important right now"
  };

  return topics[planet] ?? planet.toLowerCase();
}

function profectionSignTone(sign: string, house: number) {
  const tones: Record<string, string> = {
    Aries: "Aries gives the year a more immediate tone. The pressure may come through action, urgency, irritation, courage, or the need to choose before everything feels fully settled.",
    Taurus: "Taurus gives the year a slower and more embodied tone. The pressure may show up around stability, comfort, money, the body, loyalty, and the need to feel secure. Taurus does not usually process through urgency. It takes time to settle into what feels solid.",
    Gemini: "Gemini gives the year a more mental and responsive tone. The pressure may come through conversations, questions, information, movement, and the need to keep adjusting as new details arrive.",
    Cancer: "Cancer gives the year a protective and emotionally sensitive tone. The pressure may come through family, memory, belonging, care, and the need to know what is safe enough to trust.",
    Leo: "Leo gives the year a more visible and heart-centered tone. The pressure may come through being seen, wanting more life, creating something personal, or learning where pride and vulnerability sit close together.",
    Virgo: "Virgo gives the year an analytical and practical tone. The pressure may come through thinking, tracking details, managing what feels unresolved, or trying to make sense of something that has not fully come into focus yet.",
    Libra: "Libra gives the year a relational tone. The pressure may come through fairness, attraction, comparison, aesthetics, agreement, and the need to understand what balance actually costs.",
    Scorpio: "Scorpio gives the year a private and intense tone. The pressure may come through trust, fear, desire, shared resources, secrecy, and the need to be honest about what is happening under the surface.",
    Sagittarius: "Sagittarius gives the year a searching tone. The pressure may come through belief, distance, teaching, travel, honesty, and the need to understand what an experience means in a larger frame.",
    Capricorn: "Capricorn gives the year a serious and consequential tone. The pressure may come through responsibility, timing, commitment, maturity, and the need to build something strong enough to hold weight.",
    Aquarius: "Aquarius gives the year a future-minded and unconventional tone. The pressure may come through friendship, systems, distance, social patterns, and the need to understand where the old structure no longer fits.",
    Pisces: "Pisces gives the year a porous and emotionally permeable tone. The pressure may come through longing, imagination, compassion, confusion, rest, and the need to feel what cannot be explained cleanly."
  };

  return tones[sign] ?? `For them, the ${ordinalHouse(house)} house is in ${sign}. That gives the year its own tone and pacing.`;
}

function profectionNatalPlanetParagraph(chart: ManualChart, house: number, natalHousePositions: PlanetPosition[]) {
  const name = chart.displayName;

  if (natalHousePositions.length === 0) {
    return `${name} does not have natal planets in this house. That does not make the year unimportant. It means the house may not always feel like the loudest part of their chart, but this year it still gets brought forward. To understand how the year develops, the next thing to watch is the planet that rules the house.`;
  }

  const planetNames = sentenceList(natalHousePositions.map((position) => position.planet));
  const planetDetails = natalHousePositions.slice(0, 2).map((position) => {
    const role = plainPlanetTopic(position.planet);

    return `${position.planet} brings ${role} into the story`;
  });

  return `${name} has ${planetNames} in this house natally, which makes the year more personal. The profection is activating something that already lives in their chart. ${planetDetails.join(". ")}. So this may feel less like a random life topic and more like a familiar pattern becoming harder to ignore.`;
}

function profectionRulerParagraph(chart: ManualChart, sign: string, house: number, ruler: string, rulerPosition: PlanetPosition | null) {
  const name = chart.displayName;
  const houseLabel = `${ordinalHouse(house)} house`;

  if (!rulerPosition?.house) {
    return `Because ${sign} rules ${name}'s ${houseLabel}, ${ruler} becomes the lord of the year. Its natal placement would show where this year's story keeps developing.`;
  }

  const rulerHouseThemes = houseRealLifeSummary(rulerPosition.house);
  const rulerRole = plainPlanetTopic(ruler);
  const activatedThemes = houseRealLifeSummary(house);

  return `Because ${sign} rules ${name}'s ${houseLabel}, ${ruler} becomes the lord of the year. In ${name}'s chart, ${ruler} is in ${rulerPosition.sign} in the ${ordinalHouse(rulerPosition.house)} house, so the year may move between ${activatedThemes} and ${rulerHouseThemes}. In plain terms, ${rulerRole} may be the way the year's question becomes real. The year may keep asking: ${houseRealLifeQuestion(house)}`;
}

function relevantCircleTransits(transits: TransitItem[], timing: FriendTimingContext, natalHousePositions: PlanetPosition[]) {
  const activePlanetNames = new Set(natalHousePositions.map((position) => position.planet));

  return transits
    .filter((transit) => (
      transit.natalPoint === timing.lordOfYear
      || activePlanetNames.has(transit.natalPoint)
      || ["Ascendant", "Descendant", "Sun", "Moon", "Midheaven", "Imum Coeli"].includes(transit.natalPoint)
    ))
    .slice(0, 2);
}

function aspectWithArticle(aspect: string) {
  return `${/^[aeiou]/i.test(aspect) ? "an" : "a"} ${aspect}`;
}

function circleTransitParagraph(chart: ManualChart, transit: TransitItem, currentSky: SkySnapshot, timing: FriendTimingContext) {
  const timingLabel = transitItemTimingDisplay(transit, currentSky.generatedAt).label;
  const direction = transit.direction === "applying" ? "forming" : "separating from";
  const relevance = transit.natalPoint === timing.lordOfYear
    ? `Since ${transit.natalPoint} is the lord of the year, this ties directly into the main story.`
    : ["Ascendant", "Descendant"].includes(transit.natalPoint)
      ? "Since this touches one of the relationship and visibility points in the chart, it may affect how they show up with other people or how readable they feel from the outside."
      : ["Sun", "Moon"].includes(transit.natalPoint)
        ? "Since this touches a core personal point, it may be easier to see in their mood, energy, confidence, or daily choices."
        : "Since this touches something already active in the house-year story, it may make the main theme harder to ignore.";
  const behavior = transit.natalPoint === timing.lordOfYear
    ? `they may seem more aware of whether they have the energy, respect, room, or support to keep doing things the same way`
    : transit.natalPoint === "Moon"
      ? "their reactions may be closer to the surface, even if the outside situation looks ordinary"
      : transit.natalPoint === "Sun"
        ? "questions of confidence, energy, pride, or being taken seriously may feel more personal"
        : ["Ascendant", "Descendant"].includes(transit.natalPoint)
          ? "other people may notice the shift before they explain it, especially in tone, availability, or direct relationship dynamics"
          : `the topic of ${plainPlanetTopic(transit.natalPoint)} may be harder for them to keep in the background`;

  return `This may be more noticeable right now because ${transit.transitPlanet} is ${direction} ${aspectWithArticle(transit.aspect)} to ${chart.displayName}'s ${transit.natalPoint} (${timingLabel}). ${relevance} In real life, this may look like ${behavior}. It does not have to be dramatic. It may simply make the main theme harder to ignore.`;
}

function circleSupportGuidance(chart: ManualChart, house: number) {
  const guidance: Record<number, string> = {
    1: `If you are close to ${chart.displayName}, let them change shape without needing an instant explanation. They may be trying on a more honest way of showing up.`,
    2: `If you are close to ${chart.displayName}, respect the pace at which they sort out money, comfort, and security. Practical steadiness may mean more than big reassurance.`,
    3: `If you are close to ${chart.displayName}, listen for what they are trying to say, not only the first version of it. They may need conversation to understand their own thoughts.`,
    4: `If you are close to ${chart.displayName}, do not assume privacy means disconnection. Home, family, memory, or emotional safety may need more room than usual.`,
    5: `If you are close to ${chart.displayName}, notice what brings them back to life. They may need permission to want joy, attention, romance, or creative space without defending it.`,
    6: `If you are close to ${chart.displayName}, pay attention to the small pressures. Work, health, routine, and exhaustion may be saying more than they can easily explain.`,
    7: `If you are close to ${chart.displayName}, stay clear and fair. This is not the best timing for guessing games if the relationship needs honest terms.`,
    8: `If you are close to ${chart.displayName}, move carefully around trust, money, intimacy, and control. They may need honesty without pressure.`,
    9: `If you are close to ${chart.displayName}, give their questions room. They may be revising what they believe before they know how to describe the new shape of it.`,
    10: `If you are close to ${chart.displayName}, recognize the pressure of being visible. Support may look like respecting the responsibility they are carrying.`,
    11: `If you are close to ${chart.displayName}, pay attention to belonging. They may be learning which friendships, groups, and futures still feel real.`,
    12: `If you are close to ${chart.displayName}, do not force definition too quickly. Let them have space without making them feel abandoned. They may need time before the words are ready.`
  };

  return guidance[house] ?? `If you are close to ${chart.displayName}, give them room to understand the timing at their own pace.`;
}

function personProfectionDetailBody(chart: ManualChart, currentSky: SkySnapshot, focusAreas: LifeAreaFocus[], sunriseOrb: number) {
  const timing = friendTimingContext(chart, currentSky);

  if (!chart.natalChart || !timing.profectedHouse || !timing.profectedSign || !timing.lordOfYear) {
    return `${chart.displayName}'s birth time is needed before this timing can be read clearly.`;
  }

  const house = timing.profectedHouse;
  const houseLabel = `${ordinalHouse(house)} house`;
  const rulerPosition = chart.natalChart.positions.find((position) => position.planet === timing.lordOfYear) ?? null;
  const natalHousePositions = natalPositionsInHouse(chart.natalChart, house);
  const topTransits = relevantCircleTransits(
    rankTransitsByLifeAreaFocus(rankedFriendTransits(currentSky, chart, sunriseOrb), focusAreas),
    timing,
    natalHousePositions
  );
  const paragraphs: string[] = [
    `${chart.displayName} is ${timing.age ?? "in an annual profection cycle"}, which places them in a ${houseLabel} profection year.`,
    profectionHouseMeaning(house),
    `For ${chart.displayName}, the ${houseLabel} falls in ${timing.profectedSign}. That changes how the year behaves. ${profectionSignTone(timing.profectedSign, house)} The point is not just ${houseLifeAreas[house] ?? "the house topic"}. It is how ${timing.profectedSign} handles that part of life.`,
    profectionNatalPlanetParagraph(chart, house, natalHousePositions),
    profectionRulerParagraph(chart, timing.profectedSign, house, timing.lordOfYear, rulerPosition)
  ];

  if (topTransits.length > 0) {
    paragraphs.push("Why this is live right now");
    topTransits.forEach((transit) => {
      paragraphs.push(circleTransitParagraph(chart, transit, currentSky, timing));
    });
  }

  paragraphs.push(`Overall, ${chart.displayName} may be dealing with ${houseRealLifeSummary(house)}. If they seem different from the outside, it may be because these topics are asking for more attention, not because they are simply being distant, difficult, or inconsistent.`);
  paragraphs.push(circleSupportGuidance(chart, house));

  return paragraphs.join("\n\n");
}

function circleProfectionDetailArticle(house: number, activeCharts: ManualChart[], currentSky: SkySnapshot, focusAreas: LifeAreaFocus[], sunriseOrb: number): SkyDetail {
  const names = readableNameList(activeCharts.slice(0, 3).map((chart) => chart.displayName));
  const houseLabel = `${ordinalHouse(house)} house`;
  const groupIntro =
    house === 12
      ? [
          "For this group, the focus is on what happens behind the scenes. Privacy, withdrawal, burnout, hidden pressure, and the need to release what has been carried for too long may be more present right now.",
          "The details will be personal to each person, but the question moving through the group is similar: What needs space, rest, or privacy before it can be understood?"
        ]
      : [
          `For this group, the focus is on ${groupHouseThemes(house)}. The details will be personal to each person, but the question moving through the group is similar: ${houseRealLifeQuestion(house)}`
        ];

  return {
    glyph: "☉",
    kicker: "",
    title: groupHouseHeadline(house),
    meta: `${houseLabel} years · ${names}`,
    subtitle: `${houseLabel} years · ${names}`,
    compactHeader: true,
    plainBody: false,
    bodyBeforeSections: true,
    body: groupIntro,
    sections: activeCharts.slice(0, 4).map((chart) => ({
      heading: `${chart.displayName} · ${houseLabel} year`,
      body: personProfectionDetailBody(chart, currentSky, focusAreas, sunriseOrb)
    }))
  };
}

function strongestCircleTransitForPlanet(chart: ManualChart, planet: string, currentSky: SkySnapshot, focusAreas: LifeAreaFocus[], sunriseOrb: number) {
  return rankTransitsByLifeAreaFocus(rankedFriendTransits(currentSky, chart, sunriseOrb), focusAreas)
    .filter((transit) => transit.transitPlanet === planet)
    .sort((first, second) => {
      const firstBackgroundPenalty = first.isSlowGeneralWeather ? 1 : 0;
      const secondBackgroundPenalty = second.isSlowGeneralWeather ? 1 : 0;

      return firstBackgroundPenalty - secondBackgroundPenalty || transitOrbValue(first) - transitOrbValue(second);
    })[0] ?? null;
}

function strongestCircleTransitForHouse(chart: ManualChart, house: number, currentSky: SkySnapshot, focusAreas: LifeAreaFocus[], sunriseOrb: number) {
  return rankTransitsByLifeAreaFocus(rankedFriendTransits(currentSky, chart, sunriseOrb), focusAreas)
    .filter((transit) => transit.natalHouse === house || chart.natalChart?.positions.find((position) => position.planet === transit.natalPoint)?.house === house)
    .sort((first, second) => transitOrbValue(first) - transitOrbValue(second))[0] ?? null;
}

function circlePlanetDetailBody(chart: ManualChart, planet: string, currentSky: SkySnapshot, focusAreas: LifeAreaFocus[], sunriseOrb: number) {
  const transit = strongestCircleTransitForPlanet(chart, planet, currentSky, focusAreas, sunriseOrb);

  if (!transit) {
    return `${chart.displayName} is part of this shared ${planet} pattern, but the exact chart contact is not available yet. Read this as a signal to look for ${groupPlanetThemes(planet)} in the way they are moving through the moment.`;
  }

  const timing = friendTimingContext(chart, currentSky);
  const timingLabel = transitItemTimingDisplay(transit, currentSky.generatedAt).label;
  const direction = transit.direction === "applying" ? "forming" : "separating from";
  const natalHouse = transit.natalHouse ?? chart.natalChart?.positions.find((position) => position.planet === transit.natalPoint)?.house ?? null;
  const housePhrase = natalHouse ? ` in their ${ordinalHouse(natalHouse)} house, the part of life connected to ${groupHouseThemes(natalHouse)}` : "";
  const annualTiming = transit.natalPoint === timing.lordOfYear && timing.lordOfYear
    ? `Because ${transit.natalPoint} is also their lord of the year, this contact may be louder than it looks from the outside.`
    : natalHouse && timing.profectedHouse === natalHouse
      ? `Because this touches their profected house for the year, the transit may land in a life area that is already active for them.`
      : "";

  return [
    `For ${chart.displayName}, transiting ${planet} is ${direction} ${aspectWithArticle(transit.aspect)} to their ${transit.natalPoint} (${timingLabel}). This brings ${groupPlanetThemes(planet)} into contact with ${comparisonPointRole(transit.natalPoint)}${housePhrase}.`,
    annualTiming || `That means the shared ${planet} weather is not landing in a generic way for them. It is pressing on a specific part of their chart, so the same planet may look different in their life than it does for everyone else.`,
    `If you are close to ${chart.displayName}, watch for the way this shows up in real behavior rather than assuming the headline tells the whole story. ${groupPlanetExamples(planet)}`
  ].join("\n\n");
}

function circlePlanetDetailArticle(planet: string, activeCharts: ManualChart[], currentSky: SkySnapshot, focusAreas: LifeAreaFocus[], sunriseOrb: number): SkyDetail {
  const uniqueCharts = Array.from(new Map(activeCharts.map((chart) => [chart.id, chart])).values());
  const names = readableNameList(uniqueCharts.slice(0, 3).map((chart) => chart.displayName));

  return {
    glyph: pointGlyph(planet),
    kicker: "",
    title: groupPlanetHeadline(planet),
    meta: `${planet} contacts · ${names}`,
    subtitle: `${planet} contacts · ${names}`,
    compactHeader: true,
    plainBody: false,
    bodyBeforeSections: true,
    body: [
      `The feed card is showing a shared transit pattern: more than one person is being touched by ${planet} right now. That does not mean they are living the same story. It means the same transiting planet is pressing on different parts of different charts.`
    ],
    sections: uniqueCharts.slice(0, 4).map((chart) => ({
      heading: `${chart.displayName} · ${planet} transit`,
      body: circlePlanetDetailBody(chart, planet, currentSky, focusAreas, sunriseOrb)
    }))
  };
}

function circleHouseDetailBody(chart: ManualChart, house: number, currentSky: SkySnapshot, focusAreas: LifeAreaFocus[], sunriseOrb: number) {
  const transit = strongestCircleTransitForHouse(chart, house, currentSky, focusAreas, sunriseOrb);
  const timing = friendTimingContext(chart, currentSky);
  const yearNote = timing.profectedHouse === house
    ? `This is also their ${ordinalHouse(house)} house profection year, so the house topic is not only being touched by transit. It is part of the larger annual timing.`
    : "";

  if (!transit) {
    return [
      `${chart.displayName} has current timing gathering around their ${ordinalHouse(house)} house, which brings attention to ${groupHouseThemes(house)}.`,
      yearNote || `For them, this house may be active through several smaller signals rather than one obvious transit. The details may be easier to understand by watching what keeps repeating.`
    ].filter(Boolean).join("\n\n");
  }

  const timingLabel = transitItemTimingDisplay(transit, currentSky.generatedAt).label;
  const direction = transit.direction === "applying" ? "forming" : "separating from";

  return [
    `${chart.displayName}'s ${ordinalHouse(house)} house is active through transiting ${transit.transitPlanet} ${direction} ${aspectWithArticle(transit.aspect)} to their ${transit.natalPoint} (${timingLabel}). This brings ${comparisonPointRole(transit.transitPlanet)} into ${groupHouseThemes(house)}.`,
    yearNote || `The same house can be active for more than one person, but the lived story will not be identical. For ${chart.displayName}, the question is how this transit is changing the way that house topic needs to be handled now.`,
    circleSupportGuidance(chart, house)
  ].filter(Boolean).join("\n\n");
}

function circleHouseDetailArticle(house: number, activeCharts: ManualChart[], currentSky: SkySnapshot, focusAreas: LifeAreaFocus[], sunriseOrb: number): SkyDetail {
  const uniqueCharts = Array.from(new Map(activeCharts.map((chart) => [chart.id, chart])).values());
  const names = readableNameList(uniqueCharts.slice(0, 3).map((chart) => chart.displayName));

  return {
    glyph: "⌂",
    kicker: "",
    title: groupHouseHeadline(house),
    meta: `${ordinalHouse(house)} house contacts · ${names}`,
    subtitle: `${ordinalHouse(house)} house contacts · ${names}`,
    compactHeader: true,
    plainBody: false,
    bodyBeforeSections: true,
    body: [
      `The feed card is showing a shared house pattern: more than one person has current timing pressing on ${ordinalHouse(house)} house topics. That does not mean the same event is happening to everyone. It means a similar life area is active in different charts.`
    ],
    sections: uniqueCharts.slice(0, 4).map((chart) => ({
      heading: `${chart.displayName} · ${ordinalHouse(house)} house`,
      body: circleHouseDetailBody(chart, house, currentSky, focusAreas, sunriseOrb)
    }))
  };
}

function circleLordOfYearDetailArticle(planet: string, activeCharts: ManualChart[], currentSky: SkySnapshot, focusAreas: LifeAreaFocus[], sunriseOrb: number): SkyDetail {
  const uniqueCharts = Array.from(new Map(activeCharts.map((chart) => [chart.id, chart])).values());
  const names = readableNameList(uniqueCharts.slice(0, 3).map((chart) => chart.displayName));

  return {
    glyph: pointGlyph(planet),
    kicker: "",
    title: groupPlanetHeadline(planet),
    meta: `${planet} as lord of the year · ${names}`,
    subtitle: `${planet} as lord of the year · ${names}`,
    compactHeader: true,
    plainBody: false,
    bodyBeforeSections: true,
    body: [
      `The feed card is showing an annual timing pattern: more than one person has ${planet} as lord of the year. That means ${groupPlanetThemes(planet)} may be setting the tone in different charts, even when the visible circumstances are not the same.`
    ],
    sections: uniqueCharts.slice(0, 4).map((chart) => {
      const timing = friendTimingContext(chart, currentSky);
      const house = timing.profectedHouse;
      const rulerPosition = chart.natalChart?.positions.find((position) => position.planet === planet) ?? null;
      const transit = strongestCircleTransitForPlanet(chart, planet, currentSky, focusAreas, sunriseOrb);
      const parts = [
        timing.profectedHouse && timing.profectedSign
          ? `${chart.displayName} is in a ${ordinalHouse(timing.profectedHouse)} house year, and ${planet} rules that year because ${timing.profectedSign} starts the house. This brings ${groupPlanetThemes(planet)} into the way they are handling ${house ? groupHouseThemes(house) : "this year's main topic"}.`
          : `${chart.displayName} has ${planet} emphasized as part of the current annual timing.`,
        rulerPosition?.house
          ? `In their birth chart, ${planet} is in ${rulerPosition.sign} in the ${ordinalHouse(rulerPosition.house)} house, so the year keeps linking back to ${groupHouseThemes(rulerPosition.house)}.`
          : "",
        transit
          ? circleTransitParagraph(chart, transit, currentSky, timing)
          : `If you are close to ${chart.displayName}, it may help to notice how ${groupPlanetThemes(planet)} are shaping their choices, timing, and reactions right now.`
      ].filter(Boolean);

      return {
        heading: `${chart.displayName} · ${planet} year`,
        body: parts.join("\n\n")
      };
    })
  };
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
      ? liveGeneratedContentByKeys(
          generatedContent,
          relationshipAspectContentKeys(topHit.theirPosition.planet, topHit.aspect.type, topHit.yourPosition.planet, "synastry"),
          {
            contentKey: templateFallbackContentKeys.friendsSynastryContact,
            slots: synastryTemplateSlots(
              chart.displayName,
              topHit.theirPosition.planet,
              topHit.aspect.type,
              "You",
              topHit.yourPosition.planet
            ),
            afterContentFallback: hookFallback
          }
        )
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

  return meanings[house] ?? houseLifeAreas[house] ?? "the house topic";
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

  return examples[house] ?? houseLifeAreas[house] ?? "the concrete details of this house";
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
  void aspect;
  return "";
}

function synastryContactAdvice(aspect: string) {
  void aspect;
  return "";
}

function synastryActionLine(aspect: string) {
  void aspect;
  return "";
}

function relationshipThemeTitle(firstPoint: string, secondPoint: string, aspect: string) {
  void firstPoint;
  void secondPoint;
  const fallbackTitles: Record<string, string> = {
    conjunction: "You Amplify Each Other",
    opposition: "You Mirror Each Other",
    square: "You Challenge Each Other",
    trine: "You Get Each Other",
    sextile: "You Open Doors for Each Other"
  };

  return fallbackTitles[aspect] ?? "You Affect Each Other";
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

type ThirdPersonPronouns = {
  subject: string;
  object: string;
  possessive: string;
  reflexive: string;
};

const defaultFriendPronouns: ThirdPersonPronouns = {
  subject: "they",
  object: "them",
  possessive: "their",
  reflexive: "themselves"
};

const chartPronouns: ThirdPersonPronouns = {
  subject: "it",
  object: "it",
  possessive: "its",
  reflexive: "itself"
};

function capitalizeText(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function pronounSetForOwner(ownerKind: "person" | "chart" = "person") {
  return ownerKind === "chart" ? chartPronouns : defaultFriendPronouns;
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
  const generated = generatedContent
    ? liveGeneratedContentByKeys(
        generatedContent,
        contact.contentKeys,
        {
          contentKey: templateFallbackContentKeys.friendsSynastryContact,
          slots: synastryTemplateSlots(friendName, contact.friendPoint.name, contact.aspect, comparisonName, contact.yourPoint.name),
          afterContentFallback: fallbackFromHook(
            "friends.synastry-contact",
            {
              planetA: contact.friendPoint.name,
              aspect: contact.aspect,
              planetB: contact.yourPoint.name
            }
          )
        }
      )
    : null;
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
  const hookFallback = fallbackFromHook(
    "friends.synastry-contact",
    {
      planetA: contact.friendPoint.name,
      aspect: contact.aspect,
      planetB: contact.yourPoint.name
    }
  );
  const generated = generatedContent
    ? liveGeneratedContentByKeys(
        generatedContent,
        contact.contentKeys,
        {
          contentKey: templateFallbackContentKeys.friendsSynastryContact,
          slots: synastryTemplateSlots(friendName, contact.friendPoint.name, contact.aspect, comparisonName, contact.yourPoint.name),
          afterContentFallback: hookFallback
        }
      )
    : null;
  const generatedParagraphs = generatedContentParagraphs(generated);

  if (generatedParagraphs.length > 0) {
    return generatedParagraphs.map((paragraph) => relationshipGeneratedCopyForPerspective(paragraph, friendName, comparisonName, comparisonIsSelf));
  }

  return liveGeneratedBody(generated, hookFallback.detailParagraphs).map((paragraph) => (
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
      const hookFallback = fallbackFromHook(
        "friends.house-overlay",
        {
          planet: position.planet,
          house
        }
      );
      const generated = generatedContent
        ? liveGeneratedContentByKeys(
            generatedContent,
            contentKeys,
            {
              contentKey: templateFallbackContentKeys.friendsHouseOverlay,
              slots: houseOverlayTemplateSlots(ownerName, position.planet, targetName, house),
              afterContentFallback: hookFallback
            }
          )
        : null;
      const generatedParagraphs = generatedContentParagraphs(generated);
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

  const hookFallback = fallbackFromHook(
    "friends.composite-aspect",
    {
      planetA: aspect.from,
      aspect: aspect.type,
      planetB: aspect.to
    }
  );
  const generated = generatedContent
    ? liveGeneratedContentByKeys(
        generatedContent,
        relationshipAspectContentKeys(aspect.from, aspect.type, aspect.to, "composite"),
        {
          contentKey: templateFallbackContentKeys.friendsCompositeAspect,
          slots: aspectTemplateSlots(aspect.from, aspect.type, aspect.to),
          afterContentFallback: hookFallback
        }
      )
    : null;

  if (generated) {
    return relationshipGeneratedCopyForPerspective(liveGeneratedSummary(generated, null), chartName, comparisonName, comparisonIsSelf);
  }

  return relationshipGeneratedCopyForPerspective(liveGeneratedSummary(generated, hookFallback.summary), chartName, comparisonName, comparisonIsSelf);
}

function compositePlacementRows(sky: SkySnapshot, generatedContent?: GeneratedContentMap): SocialPlacementRow[] {
  return socialPlacementRows(sky).map((row) => {
    if (!generatedContent) {
      return row;
    }

    const generated = liveGeneratedContentByKeys(
      generatedContent,
      relationshipPlacementContentKeys(row.label, row.sign, "composite", row.house),
      {
        contentKey: templateFallbackContentKeys.friendsCompositePlacement,
        slots: compositePlacementTemplateSlots({
          planet: row.label,
          sign: row.sign,
          house: row.house
        }),
        afterContentFallback: { summary: row.description }
      }
    );
    const description = relationshipGeneratedCopyForPerspective(
      liveGeneratedSummary(generated, row.description ?? ""),
      "the relationship",
      "you",
      true
    );

    return description ? { ...row, description } : row;
  });
}

function relationshipTimingSummary(
  transit: TransitItem,
  person: string,
  generatedContent?: GeneratedContentMap,
  fallback = ""
) {
  const generated = generatedContent
    ? liveGeneratedContentByKeys(
        generatedContent,
        [
          `relationship-timing-${normalizeContentIdPart(person)}-${normalizeContentIdPart(transit.transitPlanet)}-${normalizeContentIdPart(transit.aspect)}-${normalizeContentIdPart(transit.natalPoint)}`,
          `relationship-timing-${normalizeContentIdPart(transit.transitPlanet)}-${normalizeContentIdPart(transit.aspect)}-${normalizeContentIdPart(transit.natalPoint)}`,
          ...transitToNatalGeneratedContentKeys(transit)
        ],
        {
          contentKey: templateFallbackContentKeys.friendsRelationshipTiming,
          slots: relationshipTimingTemplateSlots(person, transit),
          afterContentFallback: { summary: fallback }
        }
      )
    : null;

  return liveGeneratedSummary(generated, fallback);
}

function relationshipTiming(
  profileTransits: TransitItem[],
  friendTransits: TransitItem[],
  chart: ManualChart,
  generatedContent?: GeneratedContentMap
) {
  const sharedPlanets = profileTransits.flatMap((yourTransit) => (
    friendTransits
      .filter((friendTransit) => friendTransit.transitPlanet === yourTransit.transitPlanet)
      .map((friendTransit) => ({ yourTransit, friendTransit }))
  ));

  if (sharedPlanets.length > 0) {
    return sharedPlanets.slice(0, 3).map(({ yourTransit, friendTransit }) => ({
      title: `Both charts are feeling ${yourTransit.transitPlanet}`,
      body: relationshipTimingSummary(yourTransit, "you", generatedContent, fallbackFromHook(
        "friends.relationship-timing",
        {
          transitPlanet: yourTransit.transitPlanet,
          aspect: yourTransit.aspect,
          natalPoint: yourTransit.natalPoint
        }
      ).summary ?? "")
    }));
  }

  return friendTransits.slice(0, 2).map((transit) => ({
    title: `${chart.displayName} may be feeling ${transit.transitPlanet}`,
    body: relationshipTimingSummary(transit, chart.displayName, generatedContent, fallbackFromHook(
      "friends.relationship-timing",
      {
        transitPlanet: transit.transitPlanet,
        aspect: transit.aspect,
        natalPoint: transit.natalPoint
      }
    ).summary ?? "")
  }));
}

function groupHouseHeadline(house: number) {
  const headlines: Record<number, string> = {
    1: "More than one person may be changing how they show up",
    2: "Money or comfort may be on their mind",
    3: "Messages or decisions may be taking up more room",
    4: "Home or family may need more room",
    5: "More than one person may need more joy",
    6: "Daily stress may be showing up",
    7: "Different relationships are asking for clearer terms",
    8: "Trust may feel more complicated",
    9: "A bigger question may be coming up",
    10: "Work pressure may be louder",
    11: "Friendship may feel more complicated",
    12: "Some things need privacy before they make sense"
  };

  return headlines[house] ?? "More than one person may be dealing with the same issue";
}

function groupHousePlainTopic(house: number) {
  const topics: Record<number, string> = {
    1: "how they show up",
    2: "money, comfort, or what they can afford",
    3: "a conversation, message, errand, or decision",
    4: "home, family, privacy, or something from the past",
    5: "fun, attention, romance, or a creative need",
    6: "work, health, chores, or a messy schedule",
    7: "a relationship or agreement",
    8: "trust, shared money, or something private",
    9: "a belief, plan, trip, or bigger question",
    10: "work, responsibility, or being seen",
    11: "a friendship, group, or plan for the future",
    12: "something they may still be processing privately"
  };

  return topics[house] ?? "the same issue";
}

function groupHouseFeedNotice(house: number) {
  const notices: Record<number, string> = {
    1: "Someone may be changing how they show up. Someone else may be more aware of their body, image, or first reaction.",
    2: "They may be thinking about money, comfort, or what they can actually afford right now.",
    3: "A conversation, message, errand, or decision may be taking up more space than expected.",
    4: "Home, family, privacy, or something from the past may need more attention than usual.",
    5: "They may want more fun, attention, romance, or room to make something that feels personal.",
    6: "Work, health, chores, or a messy schedule may be catching up with them.",
    7: "A relationship may need clearer terms, a direct conversation, or less guessing.",
    8: "Money shared with someone else, trust, jealousy, or something private may be harder to ignore.",
    9: "They may be questioning what they believe, where they are going, or what a recent experience means.",
    10: "Work, reputation, responsibility, or being seen may feel heavier than usual.",
    11: "They may be rethinking a friendship, group, or plan for the future.",
    12: "They may be quieter than usual because something is still being processed privately."
  };

  return notices[house] ?? "The same kind of topic may be showing up through different choices, conversations, or timing.";
}

function groupHouseSocialCue(house: number) {
  const cues: Record<number, string> = {
    1: "Give them room to change without asking for an instant explanation.",
    2: "Offer practical help before giving a pep talk.",
    3: "Listen for what they are trying to say before jumping in with advice.",
    4: "Do not take their need for privacy personally.",
    5: "Make room for joy without making them justify it.",
    6: "Ask what would make the day easier.",
    7: "Be clear, direct, and fair.",
    8: "Do not push for more than they are ready to share.",
    9: "Let them think out loud before expecting a final answer.",
    10: "Respect the pressure they may be carrying.",
    11: "Ask what feels off instead of assuming they are pulling away.",
    12: "Stay available, but do not force them to explain too soon."
  };

  return cues[house] ?? "Ask what would actually help.";
}

function groupHouseThemes(house: number) {
  const themes: Record<number, string> = {
    1: "how someone is showing up, how their body feels, and what kind of life they are ready to enter",
    2: "money, stability, self-worth, and what feels worth protecting",
    3: "conversation, learning, local movement, and the details people keep noticing",
    4: "home, family, privacy, and emotional security",
    5: "creativity, pleasure, romance, and the need to feel alive",
    6: "work, health, routines, maintenance, and daily stress",
    7: "partnership, conflict, agreement, and one-to-one dynamics",
    8: "trust, shared resources, vulnerability, and what is hard to control",
    9: "belief, study, travel, perspective, and the search for meaning",
    10: "career, reputation, responsibility, and visibility",
    11: "friendship, groups, community, and shared goals",
    12: "privacy, retreat, exhaustion, and hidden pressure"
  };

  return themes[house] ?? houseLifeAreas[house] ?? "a specific life topic";
}

function groupHouseExamples(house: number) {
  const examples: Record<number, string> = {
    1: "Someone may be changing how they enter a room. Someone else may be more aware of their body, image, or first response.",
    2: "Someone may be thinking about money or stability. Someone else may be deciding what is actually worth keeping.",
    3: "Someone may be stuck on a conversation. Someone else may be learning something through errands, messages, siblings, or the details of the day.",
    4: "Someone may need quiet at home. Someone else may be dealing with family, memory, or the private structure underneath everything else.",
    5: "Someone may want more pleasure or creative space. Someone else may be remembering what makes them feel wanted, playful, or seen.",
    6: "Someone may feel overworked or stretched thin. Someone else may be dealing with a health issue, a messy schedule, or the quiet stress of keeping everything running.",
    7: "Someone may be renegotiating a relationship. Someone else may be noticing where agreement, conflict, or attraction needs more honesty.",
    8: "Someone may be dealing with money entanglements or trust. Someone else may be carrying something vulnerable that is not easy to explain.",
    9: "Someone may be questioning a belief. Someone else may be pulled toward study, travel, teaching, or a larger frame for what has happened.",
    10: "Someone may be under pressure to be visible. Someone else may be making decisions about work, reputation, or what responsibility now requires.",
    11: "Someone may be reconsidering a friendship or group. Someone else may be thinking about where they belong and what future they want to help build.",
    12: "Someone may need rest before they can explain what is wrong. Someone else may be carrying something privately while it is still taking shape."
  };

  return examples[house] ?? "The details may look different for each person, but the same kind of life topic is active.";
}

function groupPlanetHeadline(planet: string) {
  const headlines: Record<string, string> = {
    Moon: "Feelings may be closer to the surface",
    Mercury: "Different people may be trying to say what needs saying",
    Venus: "Different people may be figuring out what they want",
    Mars: "More than one person may be reacting faster than usual",
    Jupiter: "More may feel possible, but not simple",
    Saturn: "Different people may be taking something seriously",
    Uranus: "More than one person may need room to move differently",
    Neptune: "Hope and reality may be harder to separate right now",
    Pluto: "Control may be harder to keep out of the room",
    Chiron: "The tender spot may be easier to notice"
  };

  return headlines[planet] ?? "More than one person may be dealing with the same issue";
}

function groupPlanetPlainTopic(planet: string) {
  const topics: Record<string, string> = {
    Moon: "feelings, moods, or the need for reassurance",
    Mercury: "a conversation, decision, or message",
    Venus: "what they want, like, or feel drawn toward",
    Mars: "anger, urgency, or the need to act",
    Jupiter: "an opportunity, risk, or bigger choice",
    Saturn: "a responsibility, limit, or serious decision",
    Uranus: "the need for space or a change in routine",
    Neptune: "a hope, confusion, or unclear situation",
    Pluto: "control, pressure, or an old pattern",
    Chiron: "something sensitive that needs care"
  };

  return topics[planet] ?? "the same issue";
}

function groupPlanetFeedNotice(planet: string) {
  const notices: Record<string, string> = {
    Moon: "Someone may need more reassurance. Someone else may be reacting from a feeling they have not fully explained yet.",
    Mercury: "Someone may need to clarify a conversation. Someone else may be changing their mind after new information.",
    Venus: "Someone may be thinking about what they want. Someone else may be asking whether a connection, purchase, or plan still feels right.",
    Mars: "Someone may be ready to act. Someone else may be irritated because a decision is taking too long.",
    Jupiter: "Someone may be tempted to say yes to more than they can handle. Someone else may be trying to decide whether an opportunity is actually worth it.",
    Saturn: "Someone may be taking a deadline, boundary, or responsibility seriously. Someone else may need time before they decide.",
    Uranus: "Someone may need more space than usual. Someone else may be tired of a routine that feels too tight.",
    Neptune: "Someone may be hoping for more than the situation can hold. Someone else may be avoiding a truth because the dream feels easier.",
    Pluto: "Someone may be trying to control an outcome. Someone else may be realizing an old pattern has more power than they wanted to admit.",
    Chiron: "Someone may be more sensitive than usual. Someone else may finally have words for something that has hurt for a while."
  };

  return notices[planet] ?? "The same pressure may be showing up through different choices or conversations.";
}

function groupPlanetSocialCue(planet: string) {
  const cues: Record<string, string> = {
    Moon: "Listen before giving advice.",
    Mercury: "Ask one clear question and let them answer in their own time.",
    Venus: "Do not assume you know what they want.",
    Mars: "Give them a direct option instead of adding more pressure.",
    Jupiter: "Help them check the details before they overcommit.",
    Saturn: "Ask what would actually help instead of hyping them up.",
    Uranus: "Give them room without making it a problem.",
    Neptune: "Be kind, but do not feed the fantasy.",
    Pluto: "Stay honest and do not turn it into a power struggle.",
    Chiron: "Be gentle and do not make them explain the hurt too quickly."
  };

  return cues[planet] ?? "Ask what would actually help.";
}

function groupPlanetThemes(planet: string) {
  const themes: Record<string, string> = {
    Moon: "mood, safety, memory, and emotional reaction",
    Mercury: "messages, decisions, questions, and how things get explained",
    Venus: "connection, money, desire, beauty, and what feels worth choosing",
    Mars: "drive, conflict, urgency, and the need to act",
    Jupiter: "growth, risk, belief, and the feeling that more is possible",
    Saturn: "responsibility, limits, pressure, and what has to become more solid",
    Uranus: "change, restlessness, freedom, and interrupted patterns",
    Neptune: "longing, imagination, idealization, and blurred boundaries",
    Pluto: "control, intensity, pressure, and what cannot stay buried",
    Chiron: "sensitivity, old pain, and the place that wants a more honest response"
  };

  return themes[planet] ?? comparisonPointRole(planet);
}

function groupPlanetExamples(planet: string) {
  const examples: Record<string, string> = {
    Moon: "Someone may need more reassurance. Someone else may be reacting from a private feeling they have not fully named.",
    Mercury: "Someone may need to clarify a conversation. Someone else may be changing their mind after new information arrives.",
    Venus: "Someone may be thinking about what they want. Someone else may be weighing comfort, money, attraction, or whether a connection still feels mutual.",
    Mars: "Someone may be ready to act. Someone else may be irritated because a decision has taken too long.",
    Jupiter: "Someone may be taking a risk. Someone else may be trying to tell the difference between real opportunity and overextension.",
    Saturn: "Someone may be carrying a deadline, boundary, or responsibility. Someone else may be feeling where a situation needs more structure.",
    Uranus: "Someone may need space before they can explain themselves. Someone else may be breaking a routine that has become too tight.",
    Neptune: "Someone may be hoping for more than the situation can hold. Someone else may be avoiding a truth because the dream feels easier.",
    Pluto: "Someone may be trying to control an outcome. Someone else may be realizing that an old pattern has more power than they wanted to admit.",
    Chiron: "Someone may be more sensitive than usual. Someone else may be finding language for a hurt they usually move around."
  };

  return examples[planet] ?? "The same pattern may be showing up through different choices, conversations, or timing pressures.";
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
      const names = readableNameList(uniqueCharts.slice(0, 3).map((chart) => chart.displayName));

      return {
        title: groupPlanetHeadline(planet),
        body: `${names} are all being touched by ${planet} right now. ${groupPlanetFeedNotice(planet)} ${groupPlanetSocialCue(planet)}`,
        detail: circlePlanetDetailArticle(planet, uniqueCharts, currentSky, focusAreas, sunriseOrb)
      };
    });
  const houseCards = Array.from(byHouse.entries())
    .filter(([, activeCharts]) => new Set(activeCharts.map((chart) => chart.id)).size >= 2)
    .map(([house, activeCharts]) => {
      const uniqueCharts = Array.from(new Map(activeCharts.map((chart) => [chart.id, chart])).values());
      const names = readableNameList(uniqueCharts.slice(0, 3).map((chart) => chart.displayName));

      return {
        title: groupHouseHeadline(house),
        body: `${names} may all be dealing with ${groupHousePlainTopic(house)} in different ways. ${groupHouseFeedNotice(house)} ${groupHouseSocialCue(house)}`,
        detail: circleHouseDetailArticle(house, uniqueCharts, currentSky, focusAreas, sunriseOrb)
      };
    });
  const profectionCards = Array.from(byProfectedHouse.entries())
    .filter(([, activeCharts]) => activeCharts.length >= 2)
    .map(([house, activeCharts]) => {
      const names = readableNameList(activeCharts.slice(0, 3).map((chart) => chart.displayName));

      return {
        title: groupHouseHeadline(house),
        body: `${names} may all be dealing with ${groupHousePlainTopic(house)} in different ways this year. ${groupHouseFeedNotice(house)} ${groupHouseSocialCue(house)}`,
        detail: circleProfectionDetailArticle(house, activeCharts, currentSky, focusAreas, sunriseOrb)
      };
    });
  const lordCards = Array.from(byLordOfYear.entries())
    .filter(([, activeCharts]) => activeCharts.length >= 2)
    .map(([planet, activeCharts]) => {
      const names = readableNameList(activeCharts.slice(0, 3).map((chart) => chart.displayName));

      return {
        title: groupPlanetHeadline(planet),
        body: `${names} may all be dealing with ${groupPlanetPlainTopic(planet)} in different ways this year. ${groupPlanetFeedNotice(planet)} ${groupPlanetSocialCue(planet)}`,
        detail: circleLordOfYearDetailArticle(planet, activeCharts, currentSky, focusAreas, sunriseOrb)
      };
    });

  return [...profectionCards, ...lordCards, ...planetCards, ...houseCards].slice(0, 3);
}

function circleFeedPreviewCards(
  currentSky: SkySnapshot,
  charts: ManualChart[],
  generatedContent?: GeneratedContentMap,
  focusAreas: LifeAreaFocus[] = [],
  sunriseOrb = DEFAULT_SUNRISE_ORB_DEGREES,
  profileTransits: TransitItem[] = []
) {
  const personCharts = charts.filter((chart) => chart.chartType !== "event");
  const calculatedCharts = personCharts.filter((chart) => chart.natalChart);
  const circleCards = circleActivationCards(currentSky, personCharts, focusAreas, sunriseOrb);
  const circleGeneratedSummary = (topic: string, fallback: string) => {
    const generated = generatedContent
      ? liveGeneratedContentByKeys(
          generatedContent,
          [
            `friends-circle-feed-${normalizeContentIdPart(topic)}`,
            `circle-feed-${normalizeContentIdPart(topic)}`
          ],
          {
            contentKey: templateFallbackContentKeys.friendsCircleFeed,
            slots: circleFeedTemplateSlots(topic),
            afterContentFallback: { summary: fallback }
          }
        )
      : null;

    return liveGeneratedSummary(generated, fallback);
  };

  if (circleCards.length > 0) {
    return circleCards.map((card) => ({
      ...card,
      label: "Circle pattern",
      body: circleGeneratedSummary(card.title, card.body)
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
        body: relationshipTiming(profileTransits, rankedFriendTransits(currentSky, chart, sunriseOrb), chart, generatedContent)[0]?.body
          ?? "Look at what today's sky is touching in each chart. That can make it easier to tell the difference between relationship tension and personal timing."
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

const YouRoute = lazy(() =>
  import("./routes/YouRoute").then((module) => ({
    default: module.YouRoute
  }))
);

const CalendarRoute = lazy(() =>
  import("./routes/CalendarRoute").then((module) => ({
    default: module.CalendarRoute
  }))
);

const FriendsRoute = lazy(() =>
  import("./routes/FriendsRoute").then((module) => ({
    default: module.FriendsRoute
  }))
);

const SettingsRoute = lazy(() =>
  import("./routes/SettingsRoute").then((module) => ({
    default: module.SettingsRoute
  }))
);

const SkyRoute = lazy(() =>
  import("./routes/SkyRoute").then((module) => ({
    default: module.SkyRoute
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

async function getAstrodienstSky(
  ...args: Parameters<typeof import("./services/ephemeris").getAstrodienstSky>
) {
  const { getAstrodienstSky: calculateSky } = await import("./services/ephemeris");

  return calculateSky(...args);
}

function FeatureLoadingFallback() {
  return <div className="feature-loading-fallback" aria-hidden="true" />;
}

function SkyLoadingWheel() {
  const wheelSigns = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

  return (
    <div className="sky-loading-wheel" aria-hidden="true">
      <svg viewBox="0 0 240 240" role="img">
        <circle className="sky-loading-wheel__ring" cx="120" cy="120" r="110" />
        <circle className="sky-loading-wheel__ring" cx="120" cy="120" r="82" />
        <circle className="sky-loading-wheel__ring" cx="120" cy="120" r="38" />
        <circle className="sky-loading-wheel__center" cx="120" cy="120" r="8" />
        {Array.from({ length: 12 }).map((_, index) => {
          const angle = ((index * 30) - 90) * (Math.PI / 180);
          const inner = 40;
          const outer = 110;
          const x1 = 120 + Math.cos(angle) * inner;
          const y1 = 120 + Math.sin(angle) * inner;
          const x2 = 120 + Math.cos(angle) * outer;
          const y2 = 120 + Math.sin(angle) * outer;

          return (
            <line
              className="sky-loading-wheel__spoke"
              key={index}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
            />
          );
        })}
        {wheelSigns.map((sign, index) => {
          const angle = ((index * 30) - 75) * (Math.PI / 180);
          const x = 120 + Math.cos(angle) * 92;
          const y = 120 + Math.sin(angle) * 92;

          return (
            <text className="sky-loading-wheel__sign" key={sign} x={x} y={y}>
              {sign}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function SkyLoadingCard({ compact = false }: { compact?: boolean }) {
  const bodyLines = compact ? ["short", "long"] : ["short", "long", "long", "medium"];

  return (
    <article className={`sky-loading-card${compact ? " sky-loading-card--compact" : ""}`} aria-hidden="true">
      <span className="sky-loading-card__dot" />
      <div className="sky-loading-card__main">
        <span className="sky-loading-line sky-loading-line--title" />
        <span className="sky-loading-line sky-loading-line--meta" />
        <div className="sky-loading-card__body">
          {bodyLines.map((size, index) => (
            <span className={`sky-loading-line sky-loading-line--${size}`} key={`${size}-${index}`} />
          ))}
        </div>
      </div>
    </article>
  );
}

function SkyLoadingCards({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`sky-loading-cards${compact ? " sky-loading-cards--compact" : ""}`} role="status" aria-label="Loading current sky">
      <SkyLoadingCard compact={compact} />
      <SkyLoadingCard compact={compact} />
    </div>
  );
}

export function App() {
  if (isAdminContentPath()) {
    return (
      <Suspense fallback={<main className="admin-loading-fallback">Loading admin dashboard...</main>}>
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
  const authBootstrapStartedRef = useRef(false);
  const initialSkyCacheKey = skySnapshotCacheKey(initialLocationState.location, dateInputValue());
  const initialCachedSky = readCachedSkySnapshot(initialSkyCacheKey);
  const [sky, setSky] = useState<SkySnapshot | null>(() => initialCachedSky);
  const [skyStatus, setSkyStatus] = useState<SkyLoadStatus>(initialCachedSky ? "ready" : "loading");
  const [skyGeneratedContent, setSkyGeneratedContent] = useState<GeneratedContentMap>(() => new Map());
  const [natalGeneratedContent, setNatalGeneratedContent] = useState<GeneratedContentMap>(() => new Map());
  const [relationshipGeneratedContent, setRelationshipGeneratedContent] = useState<GeneratedContentMap>(() => new Map());
  const [settingsGeneratedContent, setSettingsGeneratedContent] = useState<GeneratedContentMap>(() => new Map());
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
  const isCalendarMode = mode === "calendar";
  const isProfileMode = mode === "profile" || mode === "account" || mode === "settings";
  const usesFullPageLayout = isProfileMode || isFriendsMode || isCalendarMode;
  const activeSunriseOrbDegrees = DEFAULT_SUNRISE_ORB_DEGREES;

  function openSkyDetail(detail: SkyDetail) {
    setSelectedSkyDetail(detail);

    if (detail.routePath) {
      updateSkyDetailRouteUrl(detail.routePath);
    }
  }

  function closeSkyDetail() {
    setSelectedSkyDetail(null);
    updatePortalModeUrl(userProfile ? "member" : "guest", "push");
  }

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
      if (skyDetailRoutePathFromUrl()) {
        storePortalMode(nextMode);
        setMode(nextMode);
        return;
      }

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

    setDatePickerOpen(false);
    setMobileSkyControlsOpen(false);
    setCityPickerOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.scrollingElement?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [selectedSkyDetail]);

  useEffect(() => subscribeContentRegistry(() => {
    setContentRegistryVersion((version) => version + 1);
  }), []);

  useEffect(() => {
    let cancelled = false;
    const shouldLoadSkyGenerated = mode === "guest" || mode === "member";

    if (!shouldLoadSkyGenerated) {
      setSkyGeneratedContent(new Map());
      return () => {
        cancelled = true;
      };
    }

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
  }, [mode, skyDate]);

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
    let cancelled = false;

    if (mode !== "settings") {
      setSettingsGeneratedContent(new Map());
      return () => {
        cancelled = true;
      };
    }

    loadLiveGeneratedContent("you", skyDate)
      .then((content) => {
        if (!cancelled) {
          setSettingsGeneratedContent(content);
        }
      })
      .catch((error) => {
        console.warn("Live settings interpretations failed to load; unpublished content will remain hidden.", error);
        if (!cancelled) {
          setSettingsGeneratedContent(new Map());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mode, skyDate]);

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
    if (mode === "friends") {
      return;
    }

    let cancelled = false;
    const skyLocation = withTimeZone(location);
    const selectedDateTime = skyDateTimeFromInput(skyDate, skyLocation, new Date(skyRefreshKey));
    const cacheKey = skySnapshotCacheKey(skyLocation, skyDate);
    const cachedSky = readCachedSkySnapshot(cacheKey);

    if (cachedSky) {
      setSky(cachedSky);
      setSkyStatus("ready");
    } else {
      setSkyStatus("loading");
    }

    getAstrodienstSky(skyLocation, selectedDateTime, { includeTransitWindows: true })
      .then((nextSky) => {
        if (!cancelled) {
          setSky(nextSky);
          setSkyStatus("ready");
          writeCachedSkySnapshot(cacheKey, nextSky);
        }
      })
      .catch((error) => {
        console.warn("Swiss Ephemeris sky calculation failed; no fallback sky snapshot will be fabricated.", error);
        if (!cancelled) {
          setSky((currentSky) => currentSky ?? null);
          setSkyStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location, mode, skyDate, skyRefreshKey]);

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
    if (hasLocationPreference) {
      return;
    }

    if (!userProfile?.currentLocation && !userProfile?.currentLocationData) {
      return;
    }

    const nextLocation = userProfile.currentLocationData
      ? withTimeZone(userProfile.currentLocationData)
      : locationFromLabel(userProfile.currentLocation ?? defaultLocation.label);

    if (sameLocationInput(location, nextLocation)) {
      return;
    }

    setLocation(nextLocation);
    setManualLocation(nextLocation.label);
    setHasLocationPreference(true);
  }, [
    hasLocationPreference,
    location,
    userProfile?.currentLocation,
    userProfile?.currentLocationData?.label,
    userProfile?.currentLocationData?.latitude,
    userProfile?.currentLocationData?.longitude,
    userProfile?.currentLocationData?.timeZone
  ]);

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
        const nextTransits = sky
          ? rankedProfileTransits(sky, natalSky, birthDate, activeSunriseOrbDegrees)
          : [];

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
    sky?.generatedAt,
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
            "Start the summary with the plainest useful takeaway. Do not add a visible TLDR label.",
            "Use the summary field for the short takeaway only.",
            "Use the body or sections field for a separate daily write-up of 2 short paragraphs.",
            "Do not repeat the TLDR sentence in the body.",
            "The body should expand the practical read for today in 120 to 180 words.",
            "Sound like a sharp human astrologer writing in the TLDR Astro voice: specific, plainspoken, observant, emotionally precise, and not overly mystical.",
            "Name the concrete pressure, choice, behavior, or relationship pattern the user may notice today.",
            "Use direct sentences with clear verbs: 'You may feel...', 'Notice...', 'Name...', 'Try...'.",
            "Prefer: 'You may feel a quiet pressure today, even if you cannot explain exactly why. Notice where it shows up in your body before trying to solve it. Naming it honestly may be enough for now.'",
            "Do not write like: 'There can be a low hum of pressure today that is hard to name out loud. It tends to live in the body before it becomes a thought.'",
            "Avoid vague phrases like energy, invitation, portal, lean into, the universe, journey, alignment, may be asking, low hum, lives in the body, or hard to name out loud.",
            "Do not make this an annual profection explanation. The annual timing card appears separately below.",
            "Do not use the words profection, time lord, generated, source-backed, backend, or knowledge base.",
            "Keep the TLDR summary around 40 to 70 words; keep the body around 120 to 180 words."
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
          let generated: LiveGeneratedContent | null = null;

          try {
            generated = await generateUserContent({
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
                "Make the summary one concrete sentence for the collapsed card, without a visible TLDR label.",
                "Return 2 to 3 sections in grounded, specific language. Do not start section bodies with TLDR or any other visible scaffold label.",
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
          } catch (error) {
            console.warn("Personalized transit generation failed for one transit; continuing batch.", {
              contentKey,
              error
            });
            continue;
          }

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
    if (!shouldBootstrapAuth(mode)) {
      setAuthAccountChecked(true);
      return;
    }

    if (authBootstrapStartedRef.current) {
      return;
    }

    authBootstrapStartedRef.current = true;
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
  }, [mode]);

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
        const nextTransits = sky
          ? rankedProfileTransits(sky, natalSky, nextBirthDate, activeSunriseOrbDegrees)
          : [];

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
  const isSkyLoading = isTodayMode && skyStatus === "loading";
  const showSkyDateControls = isTodayMode && !selectedSkyDetail;
  const needsChartSetup = Boolean(userProfile && !hasCompleteChartSetup(userProfile));
  const todaySkyDate = dateInputValue();
  const tomorrowSkyDate = dateInputValue(new Date(localDayStart(new Date()).getTime() + 86_400_000));
  const skyFullChartTitleId = "sky-full-chart-title";
  const skyFullChartMeta = `${formatSkyFullChartDate(skyDate)} · ${compactCityLabel(location.label)}`;

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
              <button className={mode === "calendar" ? "active" : ""} type="button" onClick={() => navigateToPortalMode("calendar")}>
                <CalendarDays size={18} aria-hidden="true" />
                <span>Calendar</span>
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
          {showSkyDateControls && (
            <button
              className="sky-header-date-button"
              type="button"
              ref={mobileDatePickerTriggerRef}
              aria-expanded={mobileSkyControlsOpen}
              aria-controls="mobile-sky-controls"
              aria-label={`${formatSkyHeaderDateLabel(skyDate)}, ${compactCityLabel(location.label)}`}
              onClick={() => {
                setCityPickerOpen(false);
                setDatePickerOpen(false);
                setMenuOpen(false);
                setMobileSkyControlsOpen((isOpen) => !isOpen);
              }}
            >
              <span className="sky-header-date-button__date">{formatSkyHeaderDateLabel(skyDate)}</span>
              <ChevronDown className="sky-header-date-button__chevron" size={16} aria-hidden="true" />
            </button>
          )}
          {showSkyDateControls && mobileSkyControlsOpen && (
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
                <span>{compactCityLabel(location.label)}</span>
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
              <button
                className={mode === "calendar" ? "active" : ""}
                type="button"
                role="menuitem"
                onClick={() => {
                  setSelectedSkyDetail(null);
                  navigateToPortalMode("calendar");
                  setMenuOpen(false);
                }}
              >
                <CalendarDays size={20} aria-hidden="true" />
                <span>Calendar</span>
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
          <section className={isSignupMode ? "portal-grid page-shell signup-layout" : isFriendsMode ? "portal-grid page-shell friends-layout" : isCalendarMode ? "portal-grid page-shell full-page-layout calendar-layout" : isProfileMode ? "portal-grid page-shell full-page-layout" : "portal-grid page-shell sky-page sky-layout chart-layout"}>
            {!isSignupMode && !usesFullPageLayout && !isSkyLoading && sky && (
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
            {!isSignupMode && !usesFullPageLayout && isSkyLoading && (
              <section className="sky-panel sky-chart-column chart-layout__visual" aria-label="Loading current sky chart">
                <SkyLoadingWheel />
              </section>
            )}
            <section className={isCalendarMode ? "detail-panel calendar-content-column" : "detail-panel sky-content-column chart-layout__content"} aria-label="Portal details">
              {isTodayMode && (
                <SkyRoute>
                  <section className="today-hero" aria-label="Today controls">
                    <div className="sky-intro">
                      <h1 className="sky-intro__lead">
                        <span className="sky-intro__lead-desktop">{formatSkyHeroTitle()}</span>
                        <span className="sky-intro__lead-mobile">The sky today.</span>
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
                  </section>
                  <section className="today-summary-cards" aria-label="Sky summary">
                    {isSkyLoading ? (
                      <SkyLoadingCards compact />
                    ) : sky ? (
                      <SkyCards
                        sky={sky}
                        dateLabel={formatSkyFullChartDate(skyDate)}
                        locationLabel={compactCityLabel(location.label)}
                        onOpenChart={() => {
                          setDatePickerOpen(false);
                          setCityPickerOpen(false);
                          setMobileSkyControlsOpen(false);
                          setSkyFullChartOpen(true);
                        }}
                      />
                    ) : (
                      <div className="sky-card sky-card--empty" aria-live="polite">
                        <p>Current sky data could not load.</p>
                      </div>
                    )}
                  </section>
                  {isSkyLoading && (
                    <SkyLoadingCards />
                  )}
                  {!isSkyLoading && sky && (
                    <RetrogradeCallout
                      positions={sky.positions}
                      generatedAt={sky.generatedAt}
                      generatedContent={skyGeneratedContent}
                      onOpenDetail={setSelectedSkyDetail}
                    />
                  )}
                  {!isSkyLoading && sky && mode === "guest" && (
                    <TodayView
                      positions={sky.positions}
                      aspects={sky.aspects}
                      generatedAt={sky.generatedAt}
                      generatedContent={skyGeneratedContent}
                      lifeAreaFocus={[]}
                      onOpenDetail={setSelectedSkyDetail}
                    />
                  )}
                  {!isSkyLoading && sky && mode === "member" && (
                    <TodayView
                      positions={sky.positions}
                      aspects={sky.aspects}
                      generatedAt={sky.generatedAt}
                      generatedContent={skyGeneratedContent}
                      lifeAreaFocus={userLifeAreaFocus}
                      onOpenDetail={setSelectedSkyDetail}
                    />
                  )}
                </SkyRoute>
              )}
              {mode === "calendar" && (
                <CalendarRoute
                  fallback={<FeatureLoadingFallback />}
                  generatedContent={skyGeneratedContent}
                  location={location}
                  onLocationChange={(nextLocation) => {
                    setLocation(nextLocation);
                    setManualLocation(nextLocation.label);
                    setHasLocationPreference(true);
                  }}
                />
              )}
              {mode === "profile" && (
                <YouRoute>
                  {userProfile ? (
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
                      skyGeneratedAt={sky?.generatedAt ?? ""}
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
                  )}
                </YouRoute>
              )}
              {mode === "friends" && userProfile && sky && (
                <FriendsRoute>
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
                </FriendsRoute>
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
                <SettingsRoute>
                  {userProfile ? (
                    <SettingsView
                      profile={userProfile}
                      onUpdateProfile={setUserProfile}
                      theme={theme}
                      sunriseOrbEnabled={sunriseOrbEnabled}
                      onThemeChange={setTheme}
                      onSunriseOrbChange={setSunriseOrbEnabled}
                      dyslexiaFriendlyFont={dyslexiaFriendlyFont}
                      generatedContent={settingsGeneratedContent}
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
                  )}
                </SettingsRoute>
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

          {skyFullChartOpen && sky && (
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

function stripGeneratedTitleParagraph(paragraphs: string[], title: string) {
  const normalizedTitle = normalizedArticleCopy(title);

  return paragraphs.filter((paragraph, index) => {
    if (index !== 0) {
      return true;
    }

    const normalizedParagraph = normalizedArticleCopy(paragraph.replace(/^\*\*(.+?)\*\*$/u, "$1"));

    return normalizedParagraph !== normalizedTitle;
  });
}

function firstSentences(value: string, count: number) {
  const sentences = value
    .replace(/\s+/g, " ")
    .trim()
    .match(/[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) ?? [];

  return sentences.slice(0, count).join(" ");
}

function retrogradeGeneratedBodyParagraphs(position: PlanetPosition, generated: LiveGeneratedContent | null) {
  return stripGeneratedTitleParagraph(
    generatedContentParagraphs(generated),
    retrogradePlacementTitle(position).replace(/\bRx\b/u, "Retrograde")
  );
}

function retrogradePreviewCopy(
  position: PlanetPosition,
  generated: LiveGeneratedContent | null,
  content: ContentFallback
) {
  const generatedParagraphs = retrogradeGeneratedBodyParagraphs(position, generated);
  const sourceText = generatedParagraphs.join(" ").trim() || generated?.summary?.trim();

  if (sourceText) {
    return firstSentences(sourceText, 3);
  }

  return firstSentences(
    content.summary || content.body || content.detailParagraphs.find((paragraph) => paragraph.trim()) || "",
    3
  );
}

function retrogradeArticleTldr(
  position: PlanetPosition,
  generated: LiveGeneratedContent | null,
  content: ContentFallback
) {
  const generatedSectionTldr = generatedContentSections(generated)
    .find((section) => section.heading.trim().toLowerCase() === "tldr" || /^TLDR:\s*/i.test(section.body))
    ?.body;

  if (generatedSectionTldr) {
    return stripTldrPrefix(generatedSectionTldr);
  }

  const generatedTldr = retrogradeGeneratedBodyParagraphs(position, generated)
    .find((paragraph) => /^TLDR:\s*/i.test(paragraph));

  if (generatedTldr) {
    return stripTldrPrefix(generatedTldr);
  }

  const generatedSummary = generated?.summary?.trim() ?? "";
  const safeGeneratedSummary = /^Here['’]s a version\b/i.test(generatedSummary) ? "" : generatedSummary;
  const fallback = safeGeneratedSummary
    || content.summary
    || content.body
    || content.detailParagraphs.find((paragraph) => paragraph.trim())
    || "";

  return stripTldrPrefix(fallback);
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
  Pluto: "Where you transform and reclaim power",
  Chiron: "Where old tenderness asks for care",
  Lilith: "Where the untamed part of you refuses to be managed"
};

function readableHouseTopic(house: number) {
  return houseLifeAreas[house] ?? "this house";
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
    focus: "your daily perception",
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
    house: "desire, value, and connection are shaped here. You learn what feels worth choosing by noticing what brings ease, beauty, pleasure, or honest attraction into the house where Venus sits",
    growth: "your sense of value",
    integration: "what you want becomes clearer when it is tested against what actually feels sustaining"
  },
  Mars: {
    house: "your drive has to find an outlet here. You learn through action, effort, conflict, and the courage to move toward what you want without waiting for every condition to be perfect",
    growth: "your courage",
    integration: "your energy becomes more effective when it has a clear direction and a real problem to meet"
  },
  Jupiter: {
    house: "growth comes through this territory. You tend to find opportunity when you take the larger view, trust your experience, and let the house placement teach you something bigger",
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
    house: "longing, imagination, and sensitivity gather here. You may idealize the house topic, but you also receive subtle information through it",
    growth: "your imagination",
    integration: "the dream becomes stronger when it is held with enough clarity to survive real life"
  },
  Pluto: {
    house: "this territory carries pressure and depth. You are learning where control, fear, honesty, and transformation have to be faced rather than managed from a distance",
    growth: "your power",
    integration: "what changes you here can eventually become a source of strength, but only after it is met honestly"
  }
};

const natalSignFallbackFrames: Record<string, { quality: string; motion: string }> = {
  Aries: {
    quality: "direct and initiating",
    motion: "You are not here to wait until every variable is settled. You learn by beginning, testing your courage, and letting action reveal what thought alone cannot."
  },
  Taurus: {
    quality: "steady and embodied",
    motion: "You are not here to rush past what your body knows. You learn by moving slowly enough to recognize what is real, valuable, and worth protecting over time."
  },
  Gemini: {
    quality: "curious and responsive",
    motion: "You are not here to settle for one fixed answer too quickly. You learn by asking better questions, making connections, and letting new information change the picture."
  },
  Cancer: {
    quality: "protective and intuitive",
    motion: "You are not here to ignore memory, belonging, or care. You learn by listening to your instincts and noticing what helps you feel safe enough to stay present."
  },
  Leo: {
    quality: "expressive and visible",
    motion: "You are not here to hide the warmth of your own heart. You learn by creating, responding generously, and letting what matters to you become recognizable."
  },
  Virgo: {
    quality: "practical and observant",
    motion: "You are not here to leave everything vague. You learn by refining the pattern, improving what is workable, and turning insight into something useful."
  },
  Libra: {
    quality: "relational and balancing",
    motion: "You are not here to understand life in isolation. You learn through contrast, response, beauty, fairness, and the choices that make exchange feel more honest."
  },
  Scorpio: {
    quality: "private and intense",
    motion: "You are not here to stay on the surface. You learn by telling the truth about trust, fear, desire, and the deeper motives that shape what people do."
  },
  Sagittarius: {
    quality: "expansive and searching",
    motion: "You are not here to accept a small explanation for your life. You learn by testing belief against experience and letting distance, study, and risk widen your perspective."
  },
  Capricorn: {
    quality: "disciplined and consequential",
    motion: "You are not here to treat this casually. You learn through responsibility, patience, structure, and the slow proof that comes from building something real."
  },
  Aquarius: {
    quality: "unconventional and future-minded",
    motion: "You are not here to inherit the usual answer without questioning it. You learn by studying systems, noticing patterns, and staying open to possibilities that challenge the status quo."
  },
  Pisces: {
    quality: "sensitive and imaginative",
    motion: "You are not here to limit reality to what can be explained cleanly. You learn through subtle perception, creativity, compassion, and the wisdom of porous edges."
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
  /\bthis area of your chart\b/i,
  /\bwithout losing its\b/i,
  /\bcarries the thread\b/i,
  /\bboth places\b/i,
  /\bthemes\b/i,
  /\benergy\b/i,
  /\bactivates\b/i,
  /\bintegration\b/i,
  /\blife area\b/i,
  /\broutes? this placement\b/i,
  /\bthe story becomes more specific\b/i,
  /\bthis placement becomes more alive\b/i,
  /\ballowed to speak to each other\b/i,
  /\bthese are not just background circumstances\b/i,
  /\bthey affect how your\b/i,
  /\bwhen these conditions are supported\b/i,
  /\bwhen they are strained or neglected\b/i,
  /\bthe gift is\b/i,
  /\bthe work is\b/i,
  /\bhas to be understood alongside\b/i,
  /\bthis is inviting you\b/i
];

function possessiveArea(focus: string) {
  return focus.replace(/^your\s+/i, "");
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
    const originalArea = possessiveArea(focus);
    const concreteSentence = emptyHouseRulerHouseConcreteSentence(rulerHouse, "self");
    const concreteFollow = concreteSentence
      ? ` ${concreteSentence.replace(/^This may show up through /, "This may show up through ")}`
      : "";

    if (rulerPosition.house === Number.parseInt(houseLabel, 10)) {
      return `${houseRuler} also sits in ${rulerPosition.sign} in the ${ordinalHouse(rulerHouse)} house, so ${originalArea} keeps returning to the same ground. The pattern becomes clearer through the choices, pressures, and repeated situations that happen there.${concreteFollow}`;
    }

    return `${cuspSign} points this house toward ${houseRuler}. In your birth chart, ${houseRuler} is in ${rulerPosition.sign} in the ${ordinalHouse(rulerHouse)} house, pulling ${originalArea} toward ${rulerHouseLink}. The connection becomes practical through what happens in that house.${concreteFollow}`;
  }

  if (houseRuler) {
    const rulerProcess = natalRulerProcessLines[houseRuler] ?? `${houseRuler} shows where this pattern becomes easier to recognize in real life.`;

    return `${cuspSign} points this house toward ${houseRuler}. ${rulerProcess}`;
  }

  return `The ruler of your ${houseLabel} shows where this pattern becomes easier to recognize in real life.`;
}

function natalPlanetCoreFunction(planet: string) {
  const functions: Record<string, string> = {
    Sun: "how you build identity, confidence, vitality, and a sense of direction",
    Moon: "how your emotional body responds before you have had time to explain yourself",
    Mercury: "how your mind notices, learns, translates, and puts experience into words",
    Venus: "what you value, what you are drawn to, and what helps connection feel real",
    Mars: "how you act, pursue, defend, and move toward what you want",
    Jupiter: "where you look for growth, meaning, faith, and a wider view of life",
    Saturn: "where you build maturity, boundaries, responsibility, and earned confidence",
    Uranus: "where you need freedom, honesty, disruption, and room to break old patterns",
    Neptune: "where you are sensitive, imaginative, porous, and moved by longing",
    Pluto: "where you meet intensity, control, honesty, pressure, and deep change"
  };

  return functions[planet] ?? "how this part of you becomes active";
}

function natalPlanetPlainFunction(planet: string) {
  const functions: Record<string, string> = {
    Sun: "build identity and direction",
    Moon: "feel safe enough to respond clearly",
    Mercury: "think, speak, and understand what is happening",
    Venus: "choose what feels valuable, pleasurable, and real",
    Mars: "act on desire without burning through your own stability",
    Jupiter: "grow without losing judgment",
    Saturn: "build something reliable through time and responsibility",
    Uranus: "make freedom livable instead of only disruptive",
    Neptune: "keep sensitivity connected to reality",
    Pluto: "turn pressure into honesty instead of control"
  };

  return functions[planet] ?? "function with more awareness";
}

function natalPlanetStressExpression(planet: string) {
  const expressions: Record<string, string> = {
    Sun: "confidence can start depending too much on external proof",
    Moon: "your mood and body may start reacting before your mind understands why",
    Mercury: "your thoughts may loop, scatter, or become harder to name clearly",
    Venus: "desire, comfort, or approval can start making the decision for you",
    Mars: "action can turn into reaction, pressure, or unnecessary conflict",
    Jupiter: "hope can become overreach or a story that avoids the details",
    Saturn: "responsibility can harden into fear, pressure, or self-protection",
    Uranus: "the need for freedom can become restlessness without direction",
    Neptune: "longing can blur what is real or make boundaries harder to hold",
    Pluto: "control can become a substitute for telling the truth"
  };

  return expressions[planet] ?? "this part of you can become more reactive";
}

function natalPlanetPlacementLead(position: PlanetPosition) {
  const houseLabel = position.house ? ` in the ${ordinalHouse(position.house)} house` : "";
  const retrograde = position.motion === "retrograde" ? " is retrograde" : "";
  const lead = `Your ${position.planet}${retrograde} in ${position.sign}${houseLabel}`;
  const lines: Record<string, string> = {
    Sun: `${lead} shows where identity has to become lived, not just understood.`,
    Moon: `${lead} responds before you have had time to explain yourself.`,
    Mercury: `${lead} shows how your mind looks for the point and turns experience into language.`,
    Venus: `${lead} shows what you value, what you are drawn to, and what makes connection feel real.`,
    Mars: `${lead} shows how desire becomes action and how you move toward what matters.`,
    Jupiter: `${lead} shows where belief, confidence, and possibility have to prove themselves in real life.`,
    Saturn: `${lead} shows where maturity is built through time, pressure, and choices that can hold weight.`,
    Uranus: `${lead} shows where freedom needs a real shape instead of only a reaction against the old pattern.`,
    Neptune: `${lead} shows where sensitivity, longing, and imagination need enough clarity to stay trustworthy.`,
    Pluto: `${lead} shows where pressure asks for honesty, not control.`
  };

  return lines[position.planet] ?? `${lead} shows how this part of you works in real life.`;
}

function natalRetrogradePlacementNote(position: PlanetPosition, owner: "you" | "friend" = "you", pronouns: ThirdPersonPronouns = defaultFriendPronouns) {
  if (position.motion !== "retrograde") {
    return "";
  }

  if (owner === "friend") {
    const subject = capitalizeText(pronouns.subject);
    const notes: Record<string, string> = {
      Mercury: `Because Mercury is retrograde, ${pronouns.possessive} mind may work by revisiting, rewording, checking, and thinking things through more than once. ${subject} may need time to find the right language, but the result can be more precise.`,
      Venus: `Because Venus is retrograde, desire, affection, money, beauty, and self-worth may need a private review before ${pronouns.subject} know what ${pronouns.subject} really value. ${subject} may not trust what ${pronouns.subject} want until it has proven itself over time.`,
      Mars: `Because Mars is retrograde, action may build internally before it becomes visible. ${subject} may need to understand what ${pronouns.subject} are angry about, what ${pronouns.subject} want, or what is worth fighting for before ${pronouns.subject} move.`,
      Jupiter: `Because Jupiter is retrograde, confidence may need to be built from the inside first. ${subject} may not fully believe an idea just because it sounds inspiring. ${subject} may need to test it, question it, and live with it before ${pronouns.subject} can call it true.`,
      Saturn: `Because Saturn is retrograde, responsibility, fear, discipline, and authority may become an inner standard. ${subject} may carry pressure privately, or need to decide which rules are actually ${pronouns.possessive}.`,
      Uranus: `Because Uranus is retrograde, the need for freedom may build internally before it becomes obvious. ${subject} may not rebel loudly, but ${pronouns.subject} may quietly refuse to live inside a pattern that no longer fits.`,
      Neptune: `Because Neptune is retrograde, longing, sensitivity, imagination, and confusion may be processed privately. ${subject} may need to separate real intuition from wishful thinking.`,
      Pluto: `Because Pluto is retrograde, power, control, fear, and deep change may work below the surface. ${subject} may go through major inner shifts before anyone else sees what has changed.`
    };

    return notes[position.planet] ?? "";
  }

  const notes: Record<string, string> = {
    Mercury: "Because Mercury is retrograde, your mind may work by revisiting, rewording, checking, and thinking things through more than once. You may need time to find the right language, but the result can be more precise.",
    Venus: "Because Venus is retrograde, desire, affection, money, beauty, and self-worth may need a private review before you know what you really value. You may not trust what you want until it has proven itself over time.",
    Mars: "Because Mars is retrograde, action may build internally before it becomes visible. You may need to understand what you are angry about, what you want, or what is worth fighting for before you move.",
    Jupiter: "Because Jupiter is retrograde, confidence may need to be built from the inside first. You may not fully believe an idea just because it sounds inspiring. You may need to test it, question it, and live with it before you can call it true.",
    Saturn: "Because Saturn is retrograde, responsibility, fear, discipline, and authority may become an inner standard. You may carry pressure privately, or need to decide which rules are actually yours.",
    Uranus: "Because Uranus is retrograde, the need for freedom may build internally before it becomes obvious. You may not rebel loudly, but you may quietly refuse to live inside a pattern that no longer fits.",
    Neptune: "Because Neptune is retrograde, longing, sensitivity, imagination, and confusion may be processed privately. You may need to separate real intuition from wishful thinking.",
    Pluto: "Because Pluto is retrograde, power, control, fear, and deep change may work below the surface. You may go through major inner shifts before anyone else sees what has changed."
  };

  return notes[position.planet] ?? "";
}

function natalPlacementOpeningParagraph(position: PlanetPosition, signFrame: { quality: string; motion: string }) {
  const signTone = natalSignTonePhrases[position.sign] ?? "express this part of you with more honesty and precision";

  return `${natalPlanetPlacementLead(position)} In ${position.sign}, this part of you tends to ${signTone}.`;
}

function natalPlacementHouseSupportParagraph(
  position: PlanetPosition,
  houseFrame: { intro: string; focus: string; lived: string },
  houseLabel: string
) {
  return `In the ${houseLabel}, this shows up through ${houseFrame.lived}. The house makes the pattern concrete: it shows where ordinary choices, pressure, and timing can make the placement easier to recognize. If this house is strained, ${natalPlanetStressExpression(position.planet)}.`;
}

function natalPlacementSynthesisParagraph(
  position: PlanetPosition,
  houseFrame: { intro: string; focus: string; lived: string },
  planetFrame: { house: string; growth: string; integration: string }
) {
  const focus = possessiveArea(houseFrame.focus);

  switch (position.planet) {
    case "Sun":
      return `Confidence lasts longer when it is built from what is true, not only from what gets recognized. Over time, this can become a direction that still holds up when real life tests it.`;
    case "Moon":
      return `Emotional honesty works better when it has somewhere real to land. The steadier path is listening before your body or mood has to get louder.`;
    case "Mercury":
      return `Your words can make a situation clearer when they stay connected to what is actually happening. The mind gets steadier when it stops looping around what needs to be said or understood.`;
    case "Venus":
      return `Connection becomes more honest when you can tell the difference between real value and the pull of comfort, approval, or chemistry. What lasts is what still feels worth choosing after the first pull settles.`;
    case "Mars":
      return `Courage becomes more useful when it has a real target. The clearer path is knowing when to act and when reaction would only drain you.`;
    case "Jupiter":
      return `A wider view can open doors, but the story still needs to hold up after the excitement passes. Growth becomes stronger when it can survive contact with details.`;
    case "Saturn":
      return `Earned confidence grows through time and repeated proof. Pressure does not always mean something is wrong; sometimes it shows what needs a stronger structure.`;
    case "Uranus":
      return `Freedom becomes more useful when it can be lived, not only demanded. Change works best when it gives the pattern a real way forward.`;
    case "Neptune":
      return `Sensitivity can perceive what others miss, but the dream still needs enough shape to survive real life. Clarity protects what is actually worth trusting.`;
    case "Pluto":
      return `Strength returns when the truth is easier to face than to control. Real change lasts longer when it is not forced just to escape fear.`;
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
    if ((index === 2 || /^Because\b/.test(paragraph)) && hasNatalPlacementTemplateLeak(paragraph)) {
      return rebuiltRulerParagraph;
    }

    if ((index === 3 || /^(Over time|The gift)\b/.test(paragraph)) && hasNatalPlacementTemplateLeak(paragraph)) {
      return rebuiltSynthesisParagraph;
    }

      return paragraph
      .replace(/\s+/g, " ")
      .replace(/\bthis part of the chart\b/gi, "this placement")
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

  if (position.planet === "Moon" && position.sign === "Scorpio" && position.house === 6) {
    return [
      "Your Moon describes how your emotional body responds before you have had time to explain yourself. In Scorpio, your Moon responds deeply, privately, and instinctively. You may feel what is hidden before it is spoken. Tension, avoidance, resentment, fear, desire, and motive can register in your body before your mind has organized the meaning.",
      "In the 6th house, that emotional sensitivity is tied to daily life. Work, health, stress, routines, chores, sleep, food, and the small things that keep life running affect you more than they may appear to. When your days are steady, honest, and manageable, your emotional system has more room to settle. When your days become draining, chaotic, unfair, or disconnected from what your body needs, your mood usually knows first.",
      "This placement can make the body a truth-teller. You may notice stress as tension, exhaustion, fixation, withdrawal, defensiveness, or a strong need to regain control. That does not mean you are overreacting. It means something in your daily rhythm, workload, environment, or responsibility pattern may need attention.",
      "Scorpio points your 6th house toward Mars. This means the pattern is not only about feeling what is wrong. It is about responding to it. Mars brings action, boundaries, and movement. If something in your daily life is costing you too much effort, the way through is not to keep absorbing it silently. The way through is to change the pattern, name the pressure, or act on what your instincts already know.",
      "In your birth chart, Mars is in Aquarius in the 9th house. This connects your daily life to belief, perspective, study, travel, wisdom, and the search for a wider truth. Your routines cannot only be functional. They need to make sense to you. Your work, habits, and responsibilities need some connection to freedom, learning, and a larger view of where your life is going.",
      "Over time, your emotional steadiness grows when your daily life is built around what your body keeps telling you. You need routines that protect your energy, responsibilities that are not quietly consuming you, and enough space to think beyond survival mode. The more your days support your body, your instincts, and your need for meaning, the less you have to live in defense."
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

  const signParagraph = natalPlacementOpeningParagraph(position, signFrame);
  const retrogradeParagraph = natalRetrogradePlacementNote(position);
  const houseParagraph = natalPlacementHouseSupportParagraph(position, houseFrame, houseLabel);
  const rulerParagraph = natalRulerParagraph({
    cuspSign,
    houseFrame,
    houseLabel,
    houseRuler,
    rulerHouse,
    rulerPosition
  });
  const integrationParagraph = natalPlacementSynthesisParagraph(position, houseFrame, planetFrame);
  const paragraphs = cleanNatalPlacementLensParagraphs({
    fallbackParagraphs: [signParagraph, retrogradeParagraph, houseParagraph, rulerParagraph, integrationParagraph].filter(Boolean),
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

function articleSection(heading: string, paragraphs: string[]): YouTransitArticle["sections"][number] | null {
  const body = paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean).join("\n\n");

  return body ? { heading, tldr: "", body } : null;
}

function natalPlacementSignModuleParagraph(position: PlanetPosition, signFrame: { quality: string; motion: string }) {
  const retrograde = position.motion === "retrograde" ? " retrograde" : "";

  return `Your ${position.planet}${retrograde} in ${position.sign} describes ${natalPlanetCoreFunction(position.planet)}. In ${position.sign}, this part of you is ${signFrame.quality}. ${signFrame.motion}`;
}

function natalPlacementSignModule(
  position: PlanetPosition,
  generatedContent: GeneratedContentMap
): YouTransitArticle["sections"][number] | null {
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
  const generated = liveGeneratedContentByKeys(generatedContent, [
    natalSignContentKey(position.planet, position.sign),
    placementContentId(position.planet, position.sign)
  ], {
    contentKey: templateFallbackContentKeys.youNatalPlacement,
    slots: natalPlacementTemplateSlots(position),
    afterContentFallback: content
  });
  const generatedParagraphs = generatedContentParagraphs(generated);

  if (generatedParagraphs.length > 0) {
    return articleSection(placementTitleFromParts(position.planet, position.sign, position.motion === "retrograde"), generatedParagraphs);
  }

  if (content.detailParagraphs.length > 0) {
    return articleSection(placementTitleFromParts(position.planet, position.sign, position.motion === "retrograde"), content.detailParagraphs);
  }

  if (content.summary) {
    return articleSection(placementTitleFromParts(position.planet, position.sign, position.motion === "retrograde"), [content.summary]);
  }

  const signFrame = natalSignFallbackFrames[position.sign] ?? natalSignFallbackFrames.Aries;
  const retrogradeParagraph = natalRetrogradePlacementNote(position);

  return articleSection(
    placementTitleFromParts(position.planet, position.sign, position.motion === "retrograde"),
    [
      natalPlacementSignModuleParagraph(position, signFrame),
      retrogradeParagraph
    ]
  );
}

function natalPlacementHouseModule(
  position: PlanetPosition,
  generatedContent: GeneratedContentMap
): YouTransitArticle["sections"][number] | null {
  if (!position.house) {
    return null;
  }

  const houseLabel = `${ordinalHouse(position.house)} house`;
  const generated = liveGeneratedContent(generatedContent, natalHouseContentKey(position.planet, position.house));
  const generatedParagraphs = generatedContentParagraphs(generated);

  if (generatedParagraphs.length > 0) {
    return articleSection(`${position.planet} in the ${houseLabel}`, generatedParagraphs);
  }

  const houseFrame = natalHouseFallbackFrames[position.house];

  if (!houseFrame) {
    return null;
  }

  return articleSection(
    `${position.planet} in the ${houseLabel}`,
    [natalPlacementHouseSupportParagraph(position, houseFrame, houseLabel)]
  );
}

function natalPlacementRulerModule(
  position: PlanetPosition,
  natalSky: SkySnapshot | null,
  generatedContent: GeneratedContentMap
): YouTransitArticle["sections"][number] | null {
  if (!position.house) {
    return null;
  }

  const houseLabel = `${ordinalHouse(position.house)} house`;
  const houseFrame = natalHouseFallbackFrames[position.house];
  const cuspSign = natalSky?.ascendant ? signAtWholeSignHouse(natalSky.ascendant, position.house) : position.sign;
  const houseRuler = traditionalSignRulers[cuspSign] ?? "";
  const rulerPosition = houseRuler
    ? natalSky?.positions.find((candidate) => candidate.planet === houseRuler) ?? null
    : null;
  const rulerHouse = rulerPosition?.house ?? null;

  if (!houseFrame || !houseRuler) {
    return null;
  }

  const heading = rulerPosition?.house
    ? `${houseRuler} in ${rulerPosition.sign} in the ${ordinalHouse(rulerPosition.house)} house`
    : `${cuspSign} ruled by ${houseRuler}`;
  const generatedParagraphs = [
    ...generatedContentParagraphs(liveGeneratedContent(generatedContent, natalRulerContentKey(houseRuler))),
    ...(rulerPosition
      ? generatedContentParagraphs(liveGeneratedContent(generatedContent, natalSignContentKey(houseRuler, rulerPosition.sign)))
      : []),
    ...(rulerPosition?.house
      ? generatedContentParagraphs(liveGeneratedContent(generatedContent, natalHouseContentKey(houseRuler, rulerPosition.house)))
      : [])
  ];

  if (generatedParagraphs.length > 0) {
    return articleSection(heading, generatedParagraphs);
  }

  return articleSection(
    heading,
    [
      natalRulerParagraph({
        cuspSign,
        houseFrame,
        houseLabel,
        houseRuler,
        rulerHouse,
        rulerPosition
      })
    ]
  );
}

function natalPlacementSynthesisModule(
  position: PlanetPosition,
  liveWriteup: LiveGeneratedContent | null,
  ownerContext?: { ownerName: string; ownerKind?: "person" | "chart" }
): YouTransitArticle["sections"][number] | null {
  const isFriendOwner = ownerContext?.ownerKind !== "chart" && Boolean(ownerContext?.ownerName);
  const liveParagraphs = generatedContentParagraphs(liveWriteup);
  const hasLiveAuthoredBody = liveParagraphs.length > 0 && !isNatalPlacementLensWriteup(liveWriteup);
  const approvedBody = isFriendOwner ? "" : approvedNatalPlacementBody(position);
  const approvedParagraphs = approvedBody.split(/\n\n/).map((paragraph) => paragraph.trim()).filter(Boolean);

  if (hasLiveAuthoredBody) {
    return articleSection("Synthesis", liveParagraphs);
  }

  if (approvedParagraphs.length > 0) {
    return articleSection("Synthesis", approvedParagraphs);
  }

  return null;
}

function natalPlacementModularSections({
  generatedContent,
  liveWriteup,
  natalSky,
  ownerContext,
  position
}: {
  generatedContent: GeneratedContentMap;
  liveWriteup: LiveGeneratedContent | null;
  natalSky: SkySnapshot | null;
  ownerContext?: { ownerName: string; ownerKind?: "person" | "chart" };
  position: PlanetPosition;
}) {
  if (ownerContext?.ownerKind !== "chart" && ownerContext?.ownerName) {
    const ownerBody = placementStructureBody(position, natalSky, ownerContext);

    return [
      articleSection(natalPlacementFullTitle(position), ownerBody.split(/\n\n/))
    ].filter((section): section is YouTransitArticle["sections"][number] => Boolean(section));
  }

  return [
    natalPlacementSignModule(position, generatedContent),
    natalPlacementHouseModule(position, generatedContent),
    natalPlacementRulerModule(position, natalSky, generatedContent),
    natalPlacementSynthesisModule(position, liveWriteup, ownerContext)
  ].filter((section): section is YouTransitArticle["sections"][number] => Boolean(section));
}

const friendHousePlacementBridges: Record<number, string> = {
  1: "In the 1st house, this becomes visible through presence: the way they enter situations, respond on instinct, and become recognizable to other people before anything is explained.",
  2: "In the 2nd house, this is closely tied to worth: money, security, desire, comfort, and the things they want to hold onto because they matter.",
  3: "In the 3rd house, this moves through everyday perception: what they notice, how they speak, what they keep learning, and the immediate world that keeps shaping their thoughts.",
  4: "In the 4th house, this reaches into their private foundation. Home, family, memory, and emotional security all shape how safely this part of them can develop.",
  5: "In the 5th house, this becomes part of creative risk. Pleasure, romance, play, and the courage to be seen all show where this part of them needs room to be chosen and enjoyed.",
  6: "In the 6th house, this becomes part of daily maintenance. Work, health, routines, and the small choices that keep life functioning can affect how steadily this part of them works.",
  7: "In the 7th house, this becomes visible through direct relationship. Partnership, attraction, conflict, and agreement all show them what cannot be worked out alone.",
  8: "In the 8th house, this moves through trust. Intimacy, shared resources, vulnerability, and the deeper material people often avoid can make this placement feel more charged and consequential.",
  9: "In the 9th house, this develops through the search for meaning. Study, travel, teaching, belief, and lived experience all widen what this placement can become.",
  10: "In the 10th house, this becomes part of their public life. Career, reputation, responsibility, and visibility shape how this placement is tested and recognized over time.",
  11: "In the 11th house, this develops through community. Friendship, networks, collaboration, and long-range hopes show what this part of them wants to build beyond private life.",
  12: "In the 12th house, this works beneath the surface. Solitude, dreams, hidden pressure, and the need for retreat can make this placement private, sensitive, and hard to force into simple language."
};

const friendRulerHouseDynamics: Record<number, string> = {
  1: "identity, embodiment, instinct, and the way they meet life directly",
  2: "money, self-worth, values, and the resources that help them feel secure",
  3: "language, learning, siblings, and the immediate world they move through every day",
  4: "home, family, emotional security, and the private structures that support their life",
  5: "creativity, romance, pleasure, children, and the courage to be seen",
  6: "work, health, routines, service, and the habits that keep life functioning",
  7: "partnership, agreement, attraction, conflict, and the people who meet them face to face",
  8: "trust, shared resources, intimacy, vulnerability, and the deeper material people often avoid",
  9: "belief, study, travel, wisdom, and the search for a wider truth",
  10: "career, reputation, responsibility, authority, and the public shape of their life",
  11: "friends, networks, community, collaboration, and the future they want to help build",
  12: "solitude, hidden pressure, dreams, retreat, and what works beneath the surface"
};

const friendSignPlanetTone: Record<string, Record<string, string>> = {
  Aries: {
    Sun: "They build confidence by acting directly, naming what they want, and letting movement teach them what thinking alone cannot. The same directness can become reactive when difference starts to feel like a contest.",
    Moon: "Their instincts are quick, direct, and protective. Feelings may move fast here, and emotional clarity often comes after they have acted, spoken, or admitted what they want.",
    Mercury: "Their mind works quickly and directly. They may learn by testing an idea out loud, saying the thing first, and refining it once the conversation has started.",
    Venus: "Their affection is direct and alive. They tend to know what attracts them quickly, but they may need connection that leaves room for independence and honest desire.",
    Mars: "Their drive is immediate and initiating. They are strongest when they can move, choose, and respond honestly without turning every pressure point into a fight."
  },
  Taurus: {
    Sun: "They build confidence through steadiness, patience, and contact with what feels real. They are not here to rush into every idea just because it is available.",
    Moon: "Their emotional life needs steadiness, touch, time, and proof. Safety often comes from what is consistent enough to trust.",
    Mercury: "Their mind works best when ideas have weight, texture, and practical value. They may need time to decide what they think, but once something settles, it tends to stay.",
    Venus: "Their way of loving is steady, embodied, and loyal to what feels real. Desire becomes clearer when comfort and value have time to prove themselves.",
    Mars: "Their drive gathers slowly and becomes powerful once it has a reason to keep going. They may resist being pushed, but they can stay with what matters for a long time."
  },
  Gemini: {
    Sun: "They build confidence through curiosity, language, and movement between ideas. Identity becomes clearer when they can ask questions, make connections, and keep learning.",
    Moon: "Their feelings often move through language and pattern recognition. They may need conversation, movement, or information before an emotion becomes clear.",
    Mercury: "Their mind is fast, responsive, and built for connection. They may understand life by comparing details, asking better questions, and letting new information change the picture.",
    Venus: "Their attraction is sparked by curiosity, wit, and exchange. Connection needs movement, language, and enough freshness to stay alive.",
    Mars: "Their drive moves through words, ideas, and quick choices. They may act by naming the option, making the call, or following the thread that keeps pulling their attention."
  },
  Cancer: {
    Sun: "They build confidence through care, memory, belonging, and the instinct to protect what matters. Identity becomes stronger when they trust what helps them feel safe enough to stay present.",
    Moon: "Their emotional life is protective, intuitive, and deeply tied to memory. They often know what matters before they can explain why.",
    Mercury: "Their mind remembers tone, context, and emotional weather. Communication works best when it leaves room for care and what is not being said directly.",
    Venus: "Their affection is protective and emotionally attuned. They may value connection that feels familiar, caring, and safe enough to soften into.",
    Mars: "Their drive is protective before it is performative. They may act most fiercely when someone or something they care about needs defending."
  },
  Leo: {
    Sun: "They build confidence by letting warmth, creativity, and personal meaning become visible. Identity strengthens when they are allowed to care openly about what lights them up.",
    Moon: "Their emotional life needs warmth, recognition, and room for the heart to be visible. They may feel safest where generosity is returned honestly.",
    Mercury: "Their mind communicates with warmth and presence. Ideas become stronger when they can make them vivid, personal, and recognizable.",
    Venus: "Their affection is generous, expressive, and drawn to aliveness. They may need love that makes room for play, admiration, and visible care.",
    Mars: "Their drive strengthens when desire has heart behind it. They can move with courage when the goal feels personal and worth being seen for."
  },
  Virgo: {
    Sun: "They build confidence through care, refinement, usefulness, and the ability to improve what is workable. Identity strengthens when they can turn attention into craft.",
    Moon: "Their emotional life is sensitive to what is functional, ordered, and cared for. Small details can affect their sense of ease more than they may show.",
    Mercury: "Their mind is observant, practical, and built for refinement. They may understand things by noticing what is missing, what repeats, and what can be improved.",
    Venus: "Their affection often shows through care, attention, and practical support. Love becomes real when it is useful without becoming self-erasing.",
    Mars: "Their drive sharpens through skill, precision, and repair. They may act most effectively when there is a concrete problem to solve."
  },
  Libra: {
    Sun: "They build confidence through relationship, contrast, fairness, and the choices that make exchange feel honest. Identity becomes clearer when they understand what balance actually costs.",
    Moon: "Their emotional life is shaped by tone, reciprocity, and the quality of exchange. They may feel safest where conflict can be handled without losing respect.",
    Mercury: "Their mind works through comparison, dialogue, and the search for a cleaner balance. They may understand themselves by hearing another side.",
    Venus: "Their affection is relational, aesthetic, and attuned to mutuality. Connection needs beauty, fairness, and enough honesty to stay real.",
    Mars: "Their drive moves through negotiation, strategy, and the pressure to choose. They may need to act before perfect balance is possible."
  },
  Scorpio: {
    Sun: "They build confidence by telling the truth about trust, fear, desire, and what has power. Identity strengthens when they stop staying on the surface of what matters.",
    Moon: "Their emotional life is private, intense, and deeply perceptive. They may sense what is unspoken before anyone has named it.",
    Mercury: "Their mind goes beneath the obvious answer. They may think best when they can investigate motive, subtext, and what people avoid saying.",
    Venus: "With Venus in Scorpio, they are not usually casual about attachment. Their affection can be private, intense, and selective. They may be drawn to bonds that feel honest beneath the surface, where trust is proven through consistency and desire has emotional weight.",
    Mars: "Their drive is focused, private, and difficult to redirect once desire has locked in. They may act from instinct before they explain the pressure underneath."
  },
  Sagittarius: {
    Sun: "They build confidence through exploration, belief, risk, study, and the search for a wider truth. Identity strengthens when experience keeps expanding what they think is possible.",
    Moon: "Their emotional life needs space, honesty, and room to keep learning. They may feel safest when life does not become too small or over-contained.",
    Mercury: "Their mind looks for meaning, pattern, and the larger frame. They may communicate best when an idea has room to breathe and connect to experience.",
    Venus: "Their affection needs freedom, honesty, humor, and shared growth. They may be drawn to people and experiences that widen their world.",
    Mars: "Their drive strengthens through movement, conviction, and the promise of more. They may act quickly when something feels meaningful enough to chase."
  },
  Capricorn: {
    Sun: "They build confidence through time, responsibility, discipline, and the slow proof of building something real. Identity strengthens when effort turns into earned authority.",
    Moon: "Their emotional life may be private, contained, and shaped by responsibility. Safety often comes from knowing what can be relied on.",
    Mercury: "Their mind works through structure, consequence, and practical strategy. They may trust ideas more when those ideas can survive pressure.",
    Venus: "Their affection is serious about loyalty, time, and what can be built. Connection becomes real when it has integrity and staying power.",
    Mars: "Their drive is disciplined and consequential. They may move slowly at first, but they can keep climbing when the goal is worth the effort."
  },
  Aquarius: {
    Sun: "They build confidence by questioning inherited answers, studying systems, and staying open to possibilities outside the accepted path.",
    Moon: "Their emotional life needs space, perspective, and permission to be different. They may process feelings by stepping back far enough to see the pattern.",
    Mercury: "Their mind is drawn to systems, possibilities, and unconventional connections. They may understand life by noticing patterns other people miss.",
    Venus: "Their affection needs friendship, freedom, and room for honesty outside the usual script. They may value connection that lets both people stay distinct.",
    Mars: "Their drive sharpens around freedom, change, and the refusal to keep repeating a pattern that no longer fits."
  },
  Pisces: {
    Sun: "They build confidence through imagination, compassion, sensitivity, and the ability to stay open to what cannot be explained cleanly.",
    Moon: "Their emotional life is porous, imaginative, and deeply responsive to atmosphere. They may need quiet, art, rest, or solitude to know what is really theirs.",
    Mercury: "Their mind is intuitive, associative, and drawn to subtle meaning. They may understand through image, feeling, metaphor, or what arrives between the lines.",
    Venus: "Their affection is sensitive, romantic, and easily moved by longing or compassion. Connection needs tenderness and enough clarity to keep projection from taking over.",
    Mars: "Their drive moves through feeling, imagination, and the pull of something meaningful. They may act best when desire has a dream, cause, or creative current behind it."
  }
};

function friendSignTone(position: PlanetPosition, pronouns: ThirdPersonPronouns) {
  const signTone = friendSignPlanetTone[position.sign]?.[position.planet]
    ?? friendSignPlanetTone[position.sign]?.Sun
    ?? `In ${position.sign}, the tone is shaped by how ${pronouns.subject} meet life, solve problems, and stay close to what feels real.`;

  return signTone;
}

function friendPlacementSignBehavior(position: PlanetPosition, ownerName: string, pronouns: ThirdPersonPronouns) {
  if (position.planet === "Jupiter" && position.sign === "Leo") {
    return `In Leo, Jupiter wants confidence, warmth, and permission to care about what lights ${pronouns.object} up. ${ownerName} grows when ${pronouns.subject} let ${pronouns.possessive} perspective have a little more color and conviction.`;
  }

  if (position.planet === "Mercury" && position.sign === "Sagittarius") {
    return `With Mercury in Sagittarius, ${pronouns.possessive} mind looks for the larger meaning behind the facts. ${capitalizeText(pronouns.subject)} may think best when an idea has room to expand, connect, and point toward something bigger.`;
  }

  if (position.planet === "Mars" && position.sign === "Capricorn") {
    return `With Mars in Capricorn, ${possessiveLabel(ownerName)} drive works best when it has a clear purpose and a long-term goal. ${capitalizeText(pronouns.subject)} become stronger when ${pronouns.subject} can respect timing, measure the consequences, and put effort toward something that actually matters.`;
  }

  return friendSignTone(position, pronouns);
}

function friendHouseConcreteSentence(position: PlanetPosition, pronouns: ThirdPersonPronouns) {
  const house = position.house ?? 0;
  const sentences: Record<number, string> = {
    1: `In the 1st house, this shows through presence: the way ${pronouns.subject} enter situations, respond on instinct, and become recognizable before anything is explained.`,
    2: `In the 2nd house, this is closely tied to worth: money, security, desire, comfort, and what ${pronouns.subject} want to hold onto because it matters.`,
    3: `In the 3rd house, this comes through everyday life: conversations, questions, writing, learning, siblings, neighbors, and the small observations that keep shaping how ${pronouns.subject} see things.`,
    4: `In the 4th house, this is tied to home, family, privacy, emotional security, and the foundation ${pronouns.subject} build underneath the rest of ${pronouns.possessive} life.`,
    5: `In the 5th house, this comes through creativity, pleasure, romance, play, and the courage to let something personal be seen.`,
    6: `In the 6th house, this comes through work, health, routines, maintenance, and the small choices that decide how sustainable daily life feels.`,
    7: `In the 7th house, this becomes visible through relationship: partnership, attraction, conflict, agreement, and the people who meet ${pronouns.object} face to face.`,
    8: `In the 8th house, this moves through trust, intimacy, shared resources, vulnerability, and the material that is harder to keep on the surface.`,
    9: `In the 9th house, this develops through belief, study, travel, teaching, and the kind of truth that changes how ${pronouns.subject} live.`,
    10: `In the 10th house, this shows through career, reputation, responsibility, visibility, and the public shape of ${pronouns.possessive} life.`,
    11: `In the 11th house, this develops through friendship, groups, communities, shared goals, and the future ${pronouns.subject} want to help build.`,
    12: `In the 12th house, this works privately through solitude, hidden pressure, rest, retreat, and the patterns ${pronouns.subject} may need quiet to understand.`
  };

  return sentences[house] ?? `This placement becomes clearer through ${readableHouseTopic(house).replace(/^your\s+/i, "")}.`;
}

function friendPlacementHouseParagraph(ownerName: string, position: PlanetPosition, pronouns: ThirdPersonPronouns) {
  const houseLabel = position.house ? `the ${ordinalHouse(position.house)} house` : "this house";
  const retrograde = position.motion === "retrograde" ? " retrograde" : "";
  const placement = `${position.planet} is${retrograde} in ${position.sign}${position.house ? ` in ${houseLabel}` : ""}`;

  switch (position.planet) {
    case "Sun":
      return `${possessiveLabel(ownerName)} ${placement}. This is where ${ownerName} builds identity, confidence, and a sense of direction. ${friendHouseConcreteSentence(position, pronouns)}`;
    case "Moon":
      return `${possessiveLabel(ownerName)} ${placement}. This is where ${pronouns.possessive} body, moods, and instincts respond before everything has been explained. ${friendHouseConcreteSentence(position, pronouns)}`;
    case "Mercury":
      return `${possessiveLabel(ownerName)} ${placement}. This is where ${pronouns.subject} notice, think, learn, and put experience into words. ${friendHouseConcreteSentence(position, pronouns)}`;
    case "Venus":
      return `${possessiveLabel(ownerName)} ${placement}. This is where ${pronouns.subject} learn what feels valuable, desirable, and worth choosing. ${friendHouseConcreteSentence(position, pronouns)}`;
    case "Mars":
      return `${possessiveLabel(ownerName)} ${placement}. This is where desire becomes action and where ${pronouns.subject} learn what deserves ${pronouns.possessive} effort. ${friendHouseConcreteSentence(position, pronouns)}`;
    case "Jupiter":
      return `${possessiveLabel(ownerName)} ${placement}. This is where ${ownerName} learns to trust ${pronouns.possessive} own voice, belief, and sense of possibility. ${friendHouseConcreteSentence(position, pronouns)}`;
    case "Saturn":
      return `${possessiveLabel(ownerName)} ${placement}. This is where pressure can become maturity, skill, and earned confidence over time. ${friendHouseConcreteSentence(position, pronouns)}`;
    case "Uranus":
      return `${possessiveLabel(ownerName)} ${placement}. This is where freedom needs a real shape and old patterns become harder to keep repeating. ${friendHouseConcreteSentence(position, pronouns)}`;
    case "Neptune":
      return `${possessiveLabel(ownerName)} ${placement}. This is where sensitivity, longing, and imagination need enough clarity to stay trustworthy. ${friendHouseConcreteSentence(position, pronouns)}`;
    case "Pluto":
      return `${possessiveLabel(ownerName)} ${placement}. This is where pressure asks for honesty, not control. ${friendHouseConcreteSentence(position, pronouns)}`;
    default:
      return `${possessiveLabel(ownerName)} ${placement}. ${friendHouseConcreteSentence(position, pronouns)}`;
  }
}

function friendPlacementRulerConcern(position: PlanetPosition) {
  if (position.planet === "Venus" && position.house === 2) {
    return "worth and desire";
  }

  if (position.planet === "Moon" && position.house === 2) {
    return "emotional security and self-worth";
  }

  const planetConcerns: Record<string, string> = {
    Sun: "identity and direction",
    Moon: "emotional safety",
    Mercury: "voice and perception",
    Venus: "value and connection",
    Mars: "desire and action",
    Jupiter: "growth and belief",
    Saturn: "responsibility and confidence",
    Uranus: "freedom and change",
    Neptune: "sensitivity and imagination",
    Pluto: "power and transformation"
  };

  return planetConcerns[position.planet] ?? "this placement";
}

function friendPlacementRulerParagraph(ownerName: string, position: PlanetPosition, natalSky: SkySnapshot | null, pronouns: ThirdPersonPronouns) {
  if (!position.house) {
    return "";
  }

  const cuspSign = natalSky?.ascendant ? signAtWholeSignHouse(natalSky.ascendant, position.house) : position.sign;
  const houseRuler = traditionalSignRulers[cuspSign] ?? "";

  if (!houseRuler) {
    return "";
  }

  const rulerPosition = natalSky?.positions.find((candidate) => candidate.planet === houseRuler) ?? null;
  const houseLabel = `${ordinalHouse(position.house)} house`;

  if (!rulerPosition?.house) {
    return `${cuspSign} points ${possessiveLabel(ownerName)} ${houseLabel} toward ${houseRuler}. That ruler shows where this pattern may become easier to recognize through real choices and timing.`;
  }

  const rulerHouseDynamic = friendRulerHouseDynamics[rulerPosition.house] ?? readableHouseTopic(rulerPosition.house).replace(/^your\s+/i, "");
  const placementConcern = friendPlacementRulerConcern(position);

  if (rulerPosition.planet === position.planet && rulerPosition.sign === position.sign && rulerPosition.house === position.house) {
    return `${houseRuler} also sits in ${position.sign} in ${possessiveLabel(ownerName)} ${houseLabel}, so ${placementConcern} keeps returning to the same ground. That can make this placement feel more concentrated, familiar, and hard to ignore.`;
  }

  return `${cuspSign} points ${possessiveLabel(ownerName)} ${houseLabel} toward ${houseRuler}. In ${possessiveLabel(ownerName)} chart, ${houseRuler} is in ${rulerPosition.sign} in the ${ordinalHouse(rulerPosition.house)} house, pulling ${placementConcern} toward ${rulerHouseDynamic}.`;
}

function friendPlacementSynthesisParagraph(ownerName: string, position: PlanetPosition, pronouns: ThirdPersonPronouns) {
  switch (position.planet) {
    case "Sun":
      return `Confidence gets stronger when it comes from what is true, not only from what gets recognized.`;
    case "Moon":
      return `Emotional honesty works better when it has somewhere real to land, before the body or mood has to get louder.`;
    case "Mercury":
      return `Their words become more useful when they help other people understand the point without rushing past the details.`;
    case "Venus":
      if (position.sign === "Scorpio") {
        return `Connection becomes steadier when they can tell the difference between intensity and value.`;
      }

      return `What lasts is what still feels worth choosing after comfort, approval, or chemistry stops making the decision for them.`;
    case "Mars":
      return `Courage becomes more useful when they know what deserves effort before reaction takes over.`;
    case "Jupiter":
      return `Their wider view becomes stronger when the story still holds up after the excitement passes.`;
    case "Saturn":
      return `Confidence becomes steadier when pressure is treated as information, not proof that something is wrong.`;
    case "Uranus":
      return `Freedom becomes more useful when change gives them a livable way forward.`;
    case "Neptune":
      return `Sensitivity becomes easier to trust when the dream has enough shape to survive real life.`;
    case "Pluto":
      return `Strength returns when truth matters more than control.`;
    default:
      return `Over time, ${ownerName} can make this pattern more real in daily life. The more ${pronouns.subject} understand how it works, the more useful and honest it becomes.`;
  }
}

function friendSpecificPlacementBody(ownerName: string, position: PlanetPosition, natalSky: SkySnapshot | null, pronouns: ThirdPersonPronouns) {
  const jupiterPosition = natalSky?.positions.find((candidate) => candidate.planet === "Jupiter") ?? null;
  const saturnPosition = natalSky?.positions.find((candidate) => candidate.planet === "Saturn") ?? null;
  const mercuryPosition = natalSky?.positions.find((candidate) => candidate.planet === "Mercury") ?? null;

  if (
    position.planet === "Ascendant"
    && position.sign === "Gemini"
    && mercuryPosition?.sign === "Aquarius"
    && mercuryPosition.house === 9
  ) {
    return [
      `${possessiveLabel(ownerName)} Ascendant describes how ${pronouns.subject} enter the world: ${pronouns.possessive} presence, first response, body language, and way of meeting new experiences.`,
      `Gemini gives this Ascendant a curious, quick, and responsive quality. ${capitalizeText(pronouns.subject)} may move through life by asking questions, reading the room, making connections, and letting new information change how ${pronouns.subject} understand the moment.`,
      `Mercury, the ruler of Gemini, shows where this Ascendant is developed further. In ${possessiveLabel(ownerName)} chart, Mercury is in Aquarius in the 9th house, linking ${pronouns.possessive} sense of self to belief, study, travel, philosophy, and wider perspective.`,
      `${capitalizeText(pronouns.possessive)} way of moving through life becomes clearer when curiosity has room to turn into a larger understanding.`
    ];
  }

  if (
    position.planet === "Mercury"
    && position.sign === "Sagittarius"
    && position.house === 3
    && jupiterPosition?.sign === "Leo"
    && jupiterPosition.house === 11
  ) {
    return [
      `${possessiveLabel(ownerName)} Mercury shows how ${pronouns.subject} notice, think, learn, and put experience into words. In the 3rd house, ${pronouns.possessive} mind is closely tied to everyday life: the conversations ${pronouns.subject} have, the questions ${pronouns.subject} follow, the things ${pronouns.subject} read, the places ${pronouns.subject} move through, and the patterns ${pronouns.subject} keep noticing in ${pronouns.possessive} immediate world. Small details can become important because they help ${ownerName} understand what is really happening.`,
      `With Mercury in Sagittarius, ${pronouns.possessive} mind looks for the larger meaning behind the facts. ${capitalizeText(pronouns.subject)} may think best when an idea has room to expand, connect, and point toward something bigger. ${capitalizeText(pronouns.possessive)} communication can be honest, curious, and direct, especially when ${pronouns.subject} are trying to make sense of an experience instead of just repeating information.`,
      `Jupiter, the ruler of Sagittarius, helps show where ${possessiveLabel(ownerName)} way of thinking and communicating finds room to grow. In ${possessiveLabel(ownerName)} chart, Jupiter is in Leo in the 11th house, connecting ${pronouns.possessive} ideas and conversations to friendships, groups, communities, and shared goals. ${capitalizeText(pronouns.subject)} may feel most inspired when exchanging ideas with others, and ${pronouns.possessive} confidence can grow through sharing ${pronouns.possessive} perspective in collaborative spaces where ${pronouns.subject} can inspire others, take a visible role, and help bring people together around a shared purpose.`,
      `Over time, this placement becomes stronger when ${ownerName} learns how to turn what ${pronouns.subject} notice into meaning without rushing past the details. ${capitalizeText(pronouns.possessive)} gift is not only seeing the bigger picture. It is finding the words that help other people see it too.`
    ];
  }

  if (
    position.planet === "Mars"
    && position.sign === "Capricorn"
    && position.house === 4
    && saturnPosition?.sign === "Virgo"
    && saturnPosition.house === 12
  ) {
    return [
      `${possessiveLabel(ownerName)} Mars shows how ${pronouns.subject} act, pursue, defend, and move toward what ${pronouns.subject} want. In the 4th house, that drive is tied to home, family, privacy, emotional security, and the foundation ${pronouns.subject} build underneath the rest of ${pronouns.possessive} life. ${capitalizeText(pronouns.subject)} may feel most motivated when there is something to protect, something to stabilize, or something real that needs to be built from the ground up.`,
      `With Mars in Capricorn, ${possessiveLabel(ownerName)} drive works best when it has a clear purpose and a long-term goal. ${capitalizeText(pronouns.possessive)} effort can be disciplined, strategic, and patient enough to keep going after the first wave of urgency passes. ${capitalizeText(pronouns.subject)} are not usually at ${pronouns.possessive} strongest when ${pronouns.subject} are reacting in the moment. ${capitalizeText(pronouns.subject)} become stronger when ${pronouns.subject} can respect timing, measure the consequences, and put effort toward something that actually matters.`,
      `Saturn, the ruler of Capricorn, helps show where ${possessiveLabel(ownerName)} drive is tested and developed over time. In ${possessiveLabel(ownerName)} chart, Saturn is in Virgo in the 12th house, connecting ${pronouns.possessive} inner foundation to solitude, hidden pressure, private fears, retreat, and the work that happens beneath the surface. Some of ${pronouns.possessive} courage may be built privately, through the things ${pronouns.subject} process alone, the responsibilities ${pronouns.subject} carry quietly, or the patterns ${pronouns.subject} are learning not to let run ${pronouns.possessive} life from behind the scenes.`,
      `Over time, this placement becomes stronger when ${ownerName} learns how to act without burning through ${pronouns.possessive} own stability. ${capitalizeText(pronouns.possessive)} courage is not only about pushing harder. It is about knowing what deserves ${pronouns.possessive} effort, what needs protection, and what kind of foundation can actually support the life ${pronouns.subject} are trying to build.`
    ];
  }

  return null;
}

function natalAspectsForPlacement(position: PlanetPosition, natalSky: SkySnapshot | null) {
  return (natalSky?.aspects ?? [])
    .filter((aspect) => aspect.from === position.planet || aspect.to === position.planet)
    .slice()
    .sort((first, second) => first.orb - second.orb);
}

function natalPlacementAspectFacts(position: PlanetPosition, natalSky: SkySnapshot | null) {
  const positionByPlanet = new Map((natalSky?.positions ?? []).map((candidate) => [candidate.planet, candidate]));

  return natalAspectsForPlacement(position, natalSky).map((aspect) => {
    const otherPoint = aspectOtherPoint(aspect, position.planet);
    const fromPosition = positionByPlanet.get(aspect.from);
    const toPosition = positionByPlanet.get(aspect.to);
    const otherPosition = positionByPlanet.get(otherPoint);

    return {
      primaryPlanet: position.planet,
      primarySign: position.sign,
      primaryHouse: position.house,
      aspectType: aspect.type,
      aspectPlanet: otherPoint,
      aspectPlanetSign: otherPosition?.sign ?? "",
      aspectPlanetHouse: otherPosition?.house ?? null,
      planetA: aspect.from,
      aspect: aspect.type,
      planetB: aspect.to,
      from: aspect.from,
      to: aspect.to,
      fromSign: fromPosition?.sign ?? "",
      toSign: toPosition?.sign ?? "",
      fromHouse: fromPosition?.house ?? null,
      toHouse: toPosition?.house ?? null,
      otherPoint,
      orb: wholeDegreeOrb(aspect.orb),
      meaning: (aspect as typeof aspect & { meaning?: string }).meaning ?? ""
    };
  });
}

function natalPlacementAspectKnowledgeIds(position: PlanetPosition, natalSky: SkySnapshot | null) {
  return natalAspectsForPlacement(position, natalSky).map((aspect) => aspectContentId(aspect.from, aspect.type, aspect.to));
}

function friendIntegratedPlacementAspectParagraph(ownerName: string, position: PlanetPosition, natalSky: SkySnapshot | null, pronouns: ThirdPersonPronouns) {
  const aspects = natalAspectsForPlacement(position, natalSky);

  if (position.planet !== "Venus") {
    return "";
  }

  const hasUranusConjunction = aspects.some((aspect) => (
    aspect.type === "conjunction" && aspectOtherPoint(aspect, position.planet) === "Uranus"
  ));
  const hasTrueNodeSextile = aspects.some((aspect) => (
    aspect.type === "sextile" && aspectOtherPoint(aspect, position.planet) === "True Node"
  ));
  const aspectNotes: string[] = [];

  if (hasUranusConjunction) {
    aspectNotes.push(`Venus is also conjunct Uranus, which adds restlessness, originality, and surprise to the way ${ownerName} loves and chooses. ${capitalizeText(pronouns.subject)} may be drawn to people, aesthetics, or desires that interrupt ${pronouns.possessive} usual pattern. Connection may need honesty and depth, but it also needs freedom. If something becomes too controlled, predictable, or emotionally fixed, part of ${pronouns.object} may pull away just to feel like ${pronouns.subject} can breathe again.`);
  }

  if (hasTrueNodeSextile) {
    aspectNotes.push(`Venus sextile the True Node gives this placement a growth path. The things ${ownerName} values are not random. Attraction, pleasure, money, beauty, and connection can all become ways ${pronouns.subject} learn what ${pronouns.subject} are moving toward. When ${pronouns.subject} choose what feels alive and honest instead of what only feels familiar, Venus becomes part of ${pronouns.possessive} future direction.`);
  }

  return aspectNotes.join("\n\n");
}

function friendNatalPlacementBody(ownerName: string, position: PlanetPosition, natalSky: SkySnapshot | null, ownerKind: "person" | "chart" = "person") {
  if (ownerKind === "chart") {
    return null;
  }

  const pronouns = pronounSetForOwner(ownerKind);
  const specificBody = friendSpecificPlacementBody(ownerName, position, natalSky, pronouns);

  if (specificBody) {
    return specificBody;
  }

  const paragraphs = [
    friendPlacementHouseParagraph(ownerName, position, pronouns),
    natalRetrogradePlacementNote(position, "friend", pronouns),
    friendPlacementSignBehavior(position, ownerName, pronouns),
    friendPlacementRulerParagraph(ownerName, position, natalSky, pronouns),
    friendPlacementSynthesisParagraph(ownerName, position, pronouns)
  ].map((paragraph) => paragraph.trim()).filter(Boolean);

  return paragraphs;
}

function placementStructureBody(
  position: PlanetPosition,
  natalSky: SkySnapshot | null,
  ownerContext?: { ownerName: string; ownerKind?: "person" | "chart" }
) {
  if (ownerContext?.ownerKind !== "chart" && ownerContext?.ownerName) {
    return friendNatalPlacementBody(ownerContext.ownerName, position, natalSky, ownerContext.ownerKind ?? "person")?.join("\n\n") ?? "";
  }

  return "";
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
  const generated = generatedContent
    ? liveGeneratedContentByKeys(
        generatedContent,
        [placementContentId(position.planet, position.sign)],
        {
          contentKey: templateFallbackContentKeys.youNatalPlacement,
          slots: natalPlacementTemplateSlots(position),
          afterContentFallback: content
        }
      )
    : null;

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

const natalPlacementLensHint = "This section shows how the placement is built: the planet or point, the sign, the house, and the ruler. It explains what part of the chart is involved, where it shows up in lived experience, how it expresses itself, and where it keeps developing over time.";
const natalAngleLensHint = "The angle shows how this chart meets life directly. The sign shows the style of that orientation, and the ruler of the sign shows where it keeps developing over time. This lens explains how presence, instinct, body language, and direction become visible through the chart.";

function placementLensHint(position: PlanetPosition) {
  return ["Ascendant", "Descendant", "Midheaven", "Imum Coeli"].includes(position.planet)
    ? natalAngleLensHint
    : natalPlacementLensHint;
}

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
  const sections = natalPlacementModularSections({
    generatedContent,
    liveWriteup,
    natalSky,
    ownerContext,
    position
  });
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
    lensHint: undefined,
    compactHeader: true,
    plainBody: false,
    bodyBeforeSections: true,
    body: [],
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
    kicker: "",
    title: article.title,
    meta: article.compactHeader ? "" : article.subtitle,
    subtitle: article.compactHeader ? "" : article.subtitle,
    lensHint: ownerAwareCopy(article.lensHint),
    compactHeader: article.compactHeader,
    plainBody: article.plainBody,
    bodyBeforeSections: article.bodyBeforeSections,
    retrograde: position.motion === "retrograde",
    body: (article.body ?? []).map(ownerAwareCopy),
    sections: article.sections.map((section) => ({
      heading: cleanGeneratedSectionHeading(section.heading),
      body: ownerAwareCopy(typeof section.body === "string" ? cleanGeneratedSectionBody(section.body) : section.body)
    })),
    relatedAspects: article.relatedAspects
  };
}

function natalRisingKnowledgeSummary(risingSign: string, generatedContent?: GeneratedContentMap) {
  const content = approvedVoiceOrKnowledgeFallback(placementContentId("Ascendant", risingSign));
  const generated = generatedContent
    ? liveGeneratedContentByKeys(
        generatedContent,
        [placementContentId("Ascendant", risingSign)],
        {
          contentKey: templateFallbackContentKeys.youNatalPlacement,
          slots: {
            planet: "Ascendant",
            planetTopic: planetTopicSlot("Ascendant"),
            sign: risingSign,
            signStyle: signStyleSlot(risingSign),
            house: "1st"
          },
          afterContentFallback: content
        }
      )
    : null;

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
    retrogradeStart: "2025-01-29",
    retrogradeEnd: "2026-08-18",
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

  return formatCountdown(retrogradeStartDate, retrogradeEndDate)?.replace(/\s+left$/u, "") ?? null;
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

function retrogradeRemainingCountLabel(generatedAt: string, window?: RetrogradeWindow) {
  const count = formatRetrogradeCountChip(generatedAt, window?.retrogradeEnd);

  return count ? `${count} left` : null;
}

function primaryPlacementDurationLabel(position: PlanetPosition, generatedAt: string, retrogradeWindow?: RetrogradeWindow | null) {
  if (position.motion === "retrograde" && retrogradeWindow?.retrogradeEnd) {
    return formatCountdown(generatedAt, retrogradeWindow.retrogradeEnd);
  }

  return compactTransitDurationLabel(position, generatedAt);
}

function ChartWheelMini() {
  return (
    <svg className="sky-today-ledger__wheelmini" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="13.5" />
      <circle cx="16" cy="16" r="6.5" />
      <circle cx="16" cy="16" r="2.1" />
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index * 30 - 90) * Math.PI / 180;
        const inner = 7.6;
        const outer = 13.5;

        return (
          <line
            key={index}
            x1={16 + Math.cos(angle) * inner}
            y1={16 + Math.sin(angle) * inner}
            x2={16 + Math.cos(angle) * outer}
            y2={16 + Math.sin(angle) * outer}
          />
        );
      })}
    </svg>
  );
}

function SkyCards({
  sky,
  dateLabel,
  locationLabel,
  onOpenChart
}: {
  sky: SkySnapshot;
  dateLabel: string;
  locationLabel: string;
  onOpenChart: () => void;
}) {
  const sun = sky.positions.find((position) => position.planet === "Sun");
  const moon = sky.positions.find((position) => position.planet === "Moon");
  const sunDegree = formatBriefPlacementDegree(sun);
  const moonDegree = formatBriefPlacementDegree(moon);
  const sunSignLabel = compactSkyChicletSign(sun?.sign ?? "Current");
  const moonSign = sky.moonStatus?.sign ?? moon?.sign ?? "Current";
  const moonSignLabel = compactSkyChicletSign(moonSign);
  const moonIsVoid = sky.moonStatus?.kind === "void";
  const shouldShowMoonDegree = !moonIsVoid;
  const moonTitleLabel = moonSignLabel;
  const voidRemainingLabel = sky.moonStatus?.remainingLabel
    ?.replace(/\b(\d+)\s*hrs?\b/iu, "$1h")
    .replace(/\b(\d+)\s*min\b/iu, "$1m");
  const moonSubLabel = moonIsVoid && voidRemainingLabel
    ? `VoC · ${voidRemainingLabel} left`
    : sky.moonPhase;
  const event = nextMoonEvent(sky);
  const exactAt = event?.occursAt;
  const selectedDate = new Date(sky.generatedAt);
  const nextTitle = event ? `${event.name} in ${event.sign}` : "Next lunation";
  const nextDateTimeLabel = exactAt && !Number.isNaN(exactAt.getTime()) ? formatLunationDateTime(exactAt) : "";
  const nextCountdownLabel = exactAt && !Number.isNaN(exactAt.getTime())
    ? lunationCountdownLabel(selectedDate, exactAt).toLowerCase()
    : "";
  const nextTimingLabel = [nextDateTimeLabel, nextCountdownLabel].filter(Boolean).join(" · ");

  return (
    <>
      <section className="sky-today-ledger" aria-label="The sky today">
        <header className="sky-today-ledger__head">
          <h3>
            <span>The sky</span>
            {" "}
            <span className="soft">today</span>
          </h3>
          <p>
            <span>{dateLabel}</span>
            <span>{locationLabel}</span>
          </p>
        </header>

        <div className="sky-today-ledger__row">
          <span className="sky-today-ledger__badge" aria-hidden="true">
            <span className="sky-today-ledger__glyph">{"☉\uFE0E"}</span>
          </span>
          <span className="sky-today-ledger__label">Sun</span>
          <span className="sky-today-ledger__value">
            <strong>{sunSignLabel} {sunDegree && <small>{sunDegree}</small>}</strong>
          </span>
        </div>

        <div className="sky-today-ledger__row">
          <span className="sky-today-ledger__badge sky-today-ledger__badge--disc" aria-hidden="true">
            <MoonPhaseArt phase={sky.moonPhase} />
          </span>
          <span className="sky-today-ledger__label">Moon</span>
          <span className="sky-today-ledger__value">
            <strong>{moonTitleLabel} {moonDegree && shouldShowMoonDegree && <small>{moonDegree}</small>}</strong>
            <span>{moonSubLabel}</span>
          </span>
        </div>

        <div className="sky-today-ledger__row">
          <span className="sky-today-ledger__badge sky-today-ledger__badge--disc" aria-hidden="true">
            <MoonPhaseArt phase={event?.name ?? "Full Moon"} />
          </span>
          <span className="sky-today-ledger__label">Next</span>
          <span className="sky-today-ledger__value">
            <strong className="sky-today-ledger__name">{nextTitle}</strong>
            {nextTimingLabel && <span>{nextTimingLabel}</span>}
          </span>
        </div>

        <button className="sky-today-ledger__foot" type="button" onClick={onOpenChart} aria-label="Open full current sky chart">
          <ChartWheelMini />
          <span>View chart</span>
          <span className="sky-today-ledger__arrow" aria-hidden="true">
            <ArrowRight size={18} />
          </span>
        </button>
      </section>

      <section className="sky-lunar-brief" aria-label="Sky highlights">
        <div className="sky-lunar-pills" aria-label="Current Sun and Moon phase">
          <span className="sky-card sky-lunar-pill snap-card">
            <span className="sky-lunar-pill-icon snap-ic" aria-hidden="true">☉</span>
            <span className="sky-lunar-pill-copy">
              <em className="snap-cl">Sun</em>
              <h3>
                <span className="snap-sign">{sunSignLabel}</span>
                {sunDegree && <small className="deg">{sunDegree}</small>}
              </h3>
              <small className="sky-lunar-pill-sub sky-lunar-pill-sub--spacer snap-phase" aria-hidden="true">
                &nbsp;
              </small>
            </span>
          </span>
          <span className="sky-card sky-lunar-pill sky-lunar-pill--moon snap-card">
            <span className="sky-lunar-pill-icon sky-lunar-pill-phase snap-ic" aria-hidden="true">
              <MoonPhaseArt phase={sky.moonPhase} />
            </span>
            <span className="sky-lunar-pill-copy">
              <em className="snap-cl">Moon</em>
              <h3>
                <span className="snap-sign">{moonTitleLabel}</span>
                {moonDegree && shouldShowMoonDegree && <small className="deg">{moonDegree}</small>}
              </h3>
              <small className="sky-lunar-pill-sub snap-phase">{moonSubLabel}</small>
            </span>
          </span>
        </div>
        <NextLunationChicklet sky={sky} />
      </section>
    </>
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
      className="sky-card next-lun"
      role="group"
      aria-label={`${title}, ${countdownLabel.toLowerCase()}, ${dateTimeLabel}`}
    >
      <span className="nl-badge" aria-hidden="true">
        <span className="g">{glyph}</span>
      </span>

      <div className="nl-main">
        <div className="nl-top">
          <div className="nl-copy">
            <em className="nl-eyebrow">Upcoming</em>
            <h4>
              <span>{title}</span>
            </h4>
          </div>
          <span className="ui-pill ui-pill--neutral ui-pill--mixed nl-until">
            <DurationLabelText label={countdownLabel} />
          </span>
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
    const generated = liveGeneratedContentByKeys(
      generatedContent,
      skyPlacementGeneratedContentKeys(position, generatedAt),
      {
        contentKey: skyPlacementTemplateFallbackKey(position),
        slots: skyPlacementTemplateSlots(position),
        afterContentFallback: content
      }
    );
    const retrogradeWindow = retrogradeWindowFor(position, generatedAt);
    const durationLine = formatRetrogradeDuration(retrogradeWindow?.retrogradeStart, retrogradeWindow?.retrogradeEnd);
    const durationDescription = retrogradeWindow
      ? formatDurationLong(retrogradeWindow.retrogradeStart, retrogradeWindow.retrogradeEnd, "Retrograde")
      : null;
    const timelineLines = retrogradeTimelineLines(retrogradeWindow);
    const tldr = retrogradeArticleTldr(position, generated, content);
    const fallbackDetailParagraphs = [
      content.body,
      ...content.detailParagraphs
    ].filter((paragraph): paragraph is string => Boolean(paragraph?.trim()));
    const generatedBodyParagraphs = stripGeneratedTitleParagraph(
      liveGeneratedBody(generated, fallbackDetailParagraphs),
      retrogradePlacementTitle(position).replace(/\bRx\b/u, "Retrograde")
    );
    const detailParagraphs = [
      ...timelineLines.map((line) => <span className="retrograde-detail-line" key={line}>{line}</span>),
      ...(durationLine
        ? [
            <span className="retrograde-detail-line retrograde-detail-meta" key={`${position.planet}-retrograde-duration`}>
              <span className="ui-pill ui-pill--neutral ui-pill--mixed retro-pill retro-pill--countdown" aria-label={durationDescription ?? durationLine}>
                <DurationLabelText label={durationLine} />
              </span>
            </span>
          ]
        : []),
      ...generatedBodyParagraphs
    ];

    return {
      blurb: retrogradePreviewCopy(position, generated, content),
      count: formatRetrogradeDuration(retrogradeWindow?.retrogradeStart, retrogradeWindow?.retrogradeEnd),
      detail: {
        routePath: skyRetrogradeRoutePath(position),
        glyph: `${position.glyph} ℞`,
        kicker: retrogradeDetailKicker(position),
        title: retrogradePlacementTitle(position),
        meta: `${formatPlacementPosition(position).toUpperCase()} · ${compactRetrogradeTiming(position, retrogradeWindow)}`,
        duration: retrogradeRangeText(retrogradeWindow),
        subtitle: tldr,
        retrograde: true,
        plainBody: true,
        body: detailParagraphs,
        sections: [],
        astrologyDrilldown: generatedAstrologyDrilldown(generated),
        content: content.bundle
      } satisfies SkyDetail,
      remainingCount: retrogradeRemainingCountLabel(generatedAt, retrogradeWindow),
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
        className={`sky-card sky-pl ro-sky-pl${compact ? " ro-sky-pl--compact" : ""}`}
        type="button"
        aria-label={`Read more about ${retrogradePlacementTitle(position)}`}
        onClick={() => onOpenDetail(row.detail)}
      >
        <PlacementGlyphIcon
          className="sky-pl-glyph"
          fallback={position.glyph}
          pointName={position.planet}
          preferTextGlyph
          retrograde={position.motion === "retrograde"}
        />
        <span className="sky-pl-body">
          <span className="sky-pl-main">
            <span className="sky-pl-title">
              <span className="ro-sky-pl__name">
                {skyDisplayPlanetName(position.planet)} <span className="sky-pl-rx">Rx</span> in {position.sign}
              </span>
              <span className="sky-pl-degree">{formatPlanetDegree(position)}</span>
              <span className="ui-pill ui-pill--retrograde spl-status-item spl-status-retrograde ro-sky-pl__badge">Retrograde</span>
            </span>
          </span>
          <span className="sky-pl-range ro-sky-pl__timing">
            {row.remainingCount ? (
              <span className="ui-pill ui-pill--neutral ui-pill--mixed sky-pl-duration sky-pl-duration--retrograde">
                <DurationLabelText label={row.remainingCount} />
              </span>
            ) : null}
            <span>{row.range}</span>
          </span>
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
                  preferTextGlyph
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
                      preferTextGlyph
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

function placementDetailTitle(position: PlanetPosition, _activeAspects: SkySnapshot["aspects"]) {
  return natalPlacementTitle(position);
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
            const generated = liveGeneratedContentByKeys(
              generatedContent,
              skyAspectGeneratedContentKeys(aspect, generatedAt),
              {
                contentKey: templateFallbackContentKeys.skyAspectDetail,
                slots: skyAspectTemplateSlots(aspect),
                afterContentFallback: content
              }
            );
            const rowSummary = liveGeneratedSummary(
              generated,
              aspectRelationshipDescription(aspect.from, aspect.type, aspect.to, { positions }) || fallbackPreviewText(content)
            );

                return (
                  <button
                    type="button"
                    className="sky-card aspect-row aspect-row-button"
                    key={`${aspect.from}-${aspect.to}`}
                    aria-label={`Read more about ${title}`}
                    onClick={() => onOpenDetail(currentSkyAspectDetailArticle(aspect, generatedAt, generatedContent, positions))}
                  >
                    <AspectGlyphs from={aspect.from} aspect={aspect.type} to={aspect.to} />
                    <div className="aspect-row-copy">
                      <h3>{title}</h3>
                      {rowSummary ? <p>{rowSummary}</p> : null}
                      <span className="aspect-row-timing" aria-label={timing.label}>
                        <span className="ui-pill ui-pill--neutral ui-pill--mixed planet-placement-row__duration">
                          <DurationLabelText label={timing.durationLabel} />
                        </span>
                        <span>{timing.rangeLabel}</span>
                      </span>
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
          const statuses = placementStatuses(position);
          const isRetrograde = position.motion === "retrograde";
          const durationLabel = primaryPlacementDurationLabel(position, generatedAt, retrogradeWindow);
          const retrogradeDurationLabel = isRetrograde ? null : formatRetrogradeDuration(
            retrogradeWindow?.retrogradeStart,
            retrogradeWindow?.retrogradeEnd
          );
          const transitRangeLabel = isRetrograde && retrogradeWindow
            ? retrogradeRangeText(retrogradeWindow)
            : placementTransitRangeLabel(position, generatedAt);
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
          const generated = liveGeneratedContentByKeys(
            generatedContent,
            skyPlacementGeneratedContentKeys(position, generatedAt),
            {
              contentKey: skyPlacementTemplateFallbackKey(position),
              slots: skyPlacementTemplateSlots(position),
              afterContentFallback: content
            }
          );
          const detailParagraphs = liveGeneratedBody(generated, content.detailParagraphs);
          const body = detailParagraphs;
          const relatedAspectRows = relatedAspectRowsForPlacement({
            aspects: activeAspects,
            generatedAt,
            generatedContent,
            mode: "sky",
            onOpenSkyAspect: (aspect) => onOpenDetail(currentSkyAspectDetailArticle(aspect, generatedAt, generatedContent, positions)),
            pointName: position.planet,
            positions
          });
          const openDetail = () => onOpenDetail({
            routePath: skyPlacementRoutePath(position),
            glyph: detailGlyphForPlacement(position),
            kicker: placementDetailKicker(position, activeAspects),
            title,
            meta: `${formatPlacementPosition(position).toUpperCase()} · ${transitRangeLabel}`,
            duration: transitRangeLabel,
            retrograde: position.motion === "retrograde",
            body,
            sections: [],
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
                retrograde={isRetrograde}
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
  generatedContent,
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
  generatedContent: GeneratedContentMap;
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
  const selectedLifeAreaFocus = new Set(chartSettings.lifeAreaFocus);

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

  function updateLifeAreaFocus(area: LifeAreaFocus, enabled: boolean) {
    const nextFocus = enabled
      ? [...chartSettings.lifeAreaFocus, area]
      : chartSettings.lifeAreaFocus.filter((currentArea) => currentArea !== area);

    onUpdateProfile({
      ...profile,
      settings: {
        ...chartSettings,
        lifeAreaFocus: Array.from(new Set(nextFocus))
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
                  <span className="settings-row__field">
                    <span className="settings-row__value">{currentCityDisplay}</span>
                    <ChevronRight className="settings-row__chevron" size={18} aria-hidden="true" />
                  </span>
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
              {lifeAreaFocusOptions.map((option) => {
                const generated = liveGeneratedContentByKeys(
                  generatedContent,
                  [
                    `settings-life-area-focus-${normalizeContentIdPart(option.value)}`,
                    `life-area-focus-${normalizeContentIdPart(option.value)}`
                  ],
                  {
                    contentKey: templateFallbackContentKeys.settingsLifeAreaFocus,
                    slots: lifeAreaFocusTemplateSlots(option),
                    afterContentFallback: { summary: option.description }
                  }
                );
                const title = liveGeneratedHeadline(generated, option.label);
                const description = liveGeneratedSummary(generated, option.description);

                return (
                  <div className="settings-row settings-row-control" key={option.value}>
                    <div className="settings-row-copy">
                      <span className="settings-row-title">{title}</span>
                      <small className="settings-row-description">{description}</small>
                    </div>
                    <SwitchControl
                      checked={selectedLifeAreaFocus.has(option.value)}
                      label={`Toggle ${option.label} focus`}
                      onChange={(enabled) => updateLifeAreaFocus(option.value, enabled)}
                    />
                  </div>
                );
              })}
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
              <span className="settings-row__label">Date</span>
              <span className="settings-row__field">
                <input
                  className="account-row-input"
                  type="date"
                  value={draftBirthDate}
                  onChange={(event) => setDraftBirthDate(event.target.value)}
                  aria-label="Birth date"
                />
                <ChevronRight className="settings-row__chevron" size={18} aria-hidden="true" />
              </span>
            </label>
            <label className="settings-row account-editable-row">
              <span className="settings-row__label">Time</span>
              <span className="settings-row__field">
                <input
                  className="account-row-input"
                  type="text"
                  inputMode="text"
                  value={draftBirthTime}
                  onChange={(event) => setDraftBirthTime(event.target.value)}
                  placeholder="Not set"
                  aria-label="Birth time"
                />
                <ChevronRight className="settings-row__chevron" size={18} aria-hidden="true" />
              </span>
            </label>
            <label className="settings-row account-editable-row">
              <span className="settings-row__label">Place</span>
              <span className="settings-row__field">
                <input
                  className="account-row-input"
                  type="text"
                  value={draftBirthCity}
                  onChange={(event) => setDraftBirthCity(event.target.value)}
                  placeholder="Not set"
                  aria-label="Birth place"
                />
                <ChevronRight className="settings-row__chevron" size={18} aria-hidden="true" />
              </span>
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
  skyGeneratedAt,
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
  skyGeneratedAt: string;
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
  const profileTiming = savedBirthDate && !unknownBirthTime && natalSky?.ascendant
    ? timingContextForChart({
        birthDate: savedBirthDate,
        currentDate: skyGeneratedAt,
        ascendant: natalSky.ascendant,
        natalPositions: natalTransitTargets(natalSky)
      })
    : null;
  const profectionLine = profectionHeaderLine(profileTiming);
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
  const natalAspectRows = (natalSky?.aspects ?? [])
    .slice()
    .sort((first, second) => first.orb - second.orb)
    .slice(0, 8);
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
      const placementAspects = natalPlacementAspectFacts(position, natalSky);
      const traditionalRulerBody = traditionalSignRulers[position.sign] ?? "";
      const traditionalRulerPosition = traditionalRulerBody
        ? natalSky?.positions.find((candidate) => candidate.planet === traditionalRulerBody) ?? null
        : null;

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
          placementBody: position.planet,
          placementSign: position.sign,
          placementHouse: position.house,
          degree: formatPlanetDegree(position),
          dignity: placementDignity(position)?.label ?? null,
          retrograde: position.motion === "retrograde",
          ruler: traditionalRulerBody || null,
          rulerBody: traditionalRulerBody || null,
          traditionalRuler: traditionalRulerBody || null,
          traditionalRulerBody: traditionalRulerBody || null,
          rulerSign: traditionalRulerPosition?.sign ?? null,
          rulerHouse: traditionalRulerPosition?.house ?? null,
          traditionalRulerSign: traditionalRulerPosition?.sign ?? null,
          traditionalRulerHouse: traditionalRulerPosition?.house ?? null,
          rulers: traditionalRulerBody
            ? [{
                kind: "traditional",
                body: traditionalRulerBody,
                sign: traditionalRulerPosition?.sign ?? null,
                house: traditionalRulerPosition?.house ?? null
              }]
            : [],
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
          aspects: placementAspects,
          lenses: insight
            ? {
                house: insight.houseBody,
                naturalSign: insight.naturalLensLabel,
                naturalSignBody: insight.naturalLensBody || insight.lensBody,
                rulerThread: insight.rulerBody
              }
            : null
        },
        knowledgeIds: [
          placementContentId(position.planet, position.sign),
          ...natalPlacementAspectKnowledgeIds(position, natalSky)
        ],
        sourceSnapshot: {
          source: "tldrastro-you-placement-detail",
          chartId: primaryChart?.id ?? null,
          placementId: natalPlacementRouteId(position),
          houseSystem: "whole_sign",
          ruler: traditionalRulerBody
            ? {
                kind: "traditional",
                body: traditionalRulerBody,
                sign: traditionalRulerPosition?.sign ?? null,
                house: traditionalRulerPosition?.house ?? null
              }
            : null,
          positions: natalSky?.positions.map((candidate) => ({
            planet: candidate.planet,
            body: candidate.planet,
            sign: candidate.sign,
            house: candidate.house,
            degree: candidate.degree,
            motion: candidate.motion
          })) ?? []
        },
        voiceNotes: [
          "Seed a draft for the user's natal placement detail page.",
          "Use the provided project-authored natal placement source material as the primary source.",
          "Write the primary placement interpretation in the body field, and keep it deeper than any aspect card.",
          "If aspects are supplied, write them as shorter supporting sections that modify the primary placement instead of folding them into the main body.",
          "Keep every aspect section anchored to the primary planet, sign, and house, then show how the other natal planet modifies that pattern.",
          "Lead with what this placement means in plain direct prose before mechanics.",
          "Use the provided house lens and ruler thread as context, but author the write-up as a coherent interpretation.",
          "Do not treat natal aspects like current timing, sky weather, or a separate standalone article.",
          "Avoid vague phrases like energy, invitation, portal, lean into, the universe, journey, alignment, terrain gets processed, or makes this placement.",
          "Do not mention drafts, review status, generated content, databases, backend, or knowledge base.",
          "Keep it specific, human, and around 170 to 260 words."
        ].join("\n")
      });
      setSeededPlacementDrafts((current) => {
        const next = new Set(current);
        next.add(contentKey);
        return next;
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
        ariaLabel={`Read more about ${emptyHouseTitle(house, natalSky)}`}
        description={emptyHouseCardDescription(house, natalSky)}
        glyph={houseSign ? zodiacSignGlyphs[houseSign] ?? "○" : "○"}
        house={house}
        key={`empty-house-${house}`}
        onClick={() => {
          setActivePlacementRouteId(null);
          setTransitArticle(emptyHouseDetailArticle(house, natalSky));
          updatePortalModeUrl("profile", "push");
        }}
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
    const generated = liveGeneratedContentByKeys(
      generatedContent,
      [contentKey],
      {
        contentKey: templateFallbackContentKeys.youNatalAspect,
        slots: aspectTemplateSlots(aspect.from, aspect.type, aspect.to),
        afterContentFallback: content
      }
    );
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
    const generated = personalizedGenerated ?? liveGeneratedContentByKeys(
      generatedContent,
      [contentKey],
      {
        contentKey: templateFallbackContentKeys.youTransitToNatal,
        slots: transitToNatalTemplateSlots(transit),
        afterContentFallback: content
      }
    );
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
            <span className="ui-pill ui-pill--neutral ui-pill--mixed planet-placement-row__duration">
              <DurationLabelText label={timing.durationLabel} />
            </span>
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
  const generatedDailyWriteup = generatedDailySummary
    ? generatedDailyWriteupSections(personalTimingGenerated, generatedDailySummary)
    : [];
  const dailyUpdateSummary = generatedDailyHeadline && generatedDailySummary
    ? {
        headline: generatedDailyHeadline,
        summary: generatedDailySummary,
        writeup: generatedDailyWriteup,
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
        profectionLine={profectionLine}
        profileAvatarUrl={profile.avatarUrl}
        profileEmail={profile.email}
        profileName={profile.name}
        setupStepsLeft={setupStepsLeft}
        showNatalSignatures={showNatalSignatures}
        signatureBody={signatureBody}
        signatureTitle={signatureTitle}
        signaturesReady={signaturesReady}
        transitArticle={transitArticle}
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
    ?? "Checking synastry contacts, composite aspects, and relationship patterns.";
  const keyFactors = response?.app.keyFactors ?? [];

  return (
    <section className="relationship-api-summary" aria-label={`${mode} relationship summary`}>
      <span className="eyebrow section-label">{mode === "synastry" ? "Relationship patterns" : "Composite pattern"}</span>
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
  const selectedFriendPlacementRows = selectedChart?.natalChart ? socialPlacementRows(selectedChart.natalChart) : [];
  const selectedFriendBigThreeRows = selectedFriendPlacementRows.filter(isSocialBigThreeRow);
  const selectedFriendBigThreeDisplayRows: SocialPlacementRow[] = selectedFriendBigThreeRows.length
    ? selectedFriendBigThreeRows
    : [
      {
        id: "Sun",
        glyph: "☉",
        label: "Sun",
        sign: selectedFriendBigThree?.sun ?? "pending",
        degree: 0,
        house: null,
        retrograde: false
      },
      {
        id: "Moon",
        glyph: "☽",
        label: "Moon",
        sign: selectedFriendBigThree?.moon ?? "pending",
        degree: 0,
        house: null,
        retrograde: false
      },
      {
        id: "Ascendant",
        glyph: "↑",
        label: "Ascendant",
        sign: selectedFriendBigThree?.rising ?? "pending",
        degree: 0,
        house: selectedChart?.birthTimeUnknown ? null : 1,
        retrograde: false
      }
    ];
  const selectedFriendNatalPlacementRows = selectedChartIsEvent
    ? selectedFriendPlacementRows
    : selectedFriendPlacementRows.filter((row) => !isSocialBigThreeRow(row));
  const selectedFriendOccupiedHouses = new Set(
    (selectedChart?.natalChart?.positions ?? [])
      .filter((position) => ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"].includes(position.planet))
      .map((position) => position.house)
      .filter((house): house is number => typeof house === "number")
  );
  const selectedFriendEmptyHouses = selectedChart?.natalChart && !selectedChartIsEvent
    ? Array.from({ length: 12 }, (_, index) => index + 1).filter((house) => !selectedFriendOccupiedHouses.has(house))
    : [];
  const openFriendNatalAspectDetail = (aspect: SkySnapshot["aspects"][number]) => {
    const friendGeneratedContent = mergeGeneratedContentMaps(natalGeneratedContent, relationshipGeneratedContent);
    const ownerName = selectedChart?.displayName ?? "This chart";
    const ownerKind = selectedChartIsEvent ? "chart" : "person";
    const article = natalAspectDetailArticle(aspect, friendGeneratedContent, {
      ownerName,
      ownerKind
    });

    onOpenDetail({
      glyph: article.glyph || pointGlyph(aspect.from),
      kicker: "",
      title: article.title,
      meta: article.subtitle,
      subtitle: article.subtitle,
      compactHeader: article.compactHeader,
      bodyBeforeSections: article.bodyBeforeSections,
      plainBody: article.plainBody,
      body: article.body ?? [],
      sections: article.sections.map((section) => ({
        heading: cleanGeneratedSectionHeading(section.heading),
        body: typeof section.body === "string" ? cleanGeneratedSectionBody(section.body) : section.body
      })),
      relatedAspects: article.relatedAspects
    });
  };
  const openFriendNatalPlacementDetail = (row: SocialPlacementRow) => {
    if (!selectedChart?.natalChart) {
      return;
    }

    const position = planetPositionFromSocialRow(row, selectedChart.natalChart);

    if (!position) {
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
  const openFriendEmptyHouseDetail = (house: number) => {
    if (!selectedChart?.natalChart) {
      return;
    }

    const article = emptyHouseDetailArticle(house, selectedChart.natalChart, "friend", selectedChart.displayName);

    onOpenDetail({
      glyph: article.glyph || "○",
      kicker: "",
      title: article.title,
      meta: article.subtitle,
      subtitle: article.subtitle,
      lensHint: article.lensHint,
      compactHeader: article.compactHeader,
      plainBody: article.plainBody,
      bodyBeforeSections: article.bodyBeforeSections,
      body: article.body ?? [],
      sections: article.sections.map((section) => ({
        heading: cleanGeneratedSectionHeading(section.heading),
        body: typeof section.body === "string" ? cleanGeneratedSectionBody(section.body) : section.body
      }))
    });
  };
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
    () => circleFeedPreviewCards(
      currentSky,
      charts,
      mergeGeneratedContentMaps(natalGeneratedContent, relationshipGeneratedContent),
      lifeAreaFocus,
      sunriseOrbDegrees,
      profileTransits
    ),
    [currentSky, charts, natalGeneratedContent, relationshipGeneratedContent, lifeAreaFocus, sunriseOrbDegrees, profileTransits]
  );
  const selectableCircleCards = useMemo(
    () => circleCards.map((card) => {
      const detail = "detail" in card && isSkyDetail(card.detail) ? card.detail : null;

      return {
        ...card,
        onSelect: detail ? () => onOpenDetail(detail) : undefined
      };
    }),
    [circleCards, onOpenDetail]
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
      <b className="ui-pill ui-pill--retrograde">{birthdayCountdownLabel(upcomingBirthday.daysUntil)}</b>
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
          cards={selectableCircleCards}
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
                <span className="eyebrow section-label friend-section-label">Big three</span>
                <div className="list you-aspects-list aspect-row-list friend-aspect-list friend-big-three-list" aria-label={`${selectedChart.displayName} big three`}>
                  {selectedFriendBigThreeDisplayRows.map((row) => {
                    const title = row.label === "Ascendant"
                      ? `Ascendant in ${row.sign}`
                      : placementTitleFromParts(row.label, row.sign, row.retrograde);
                    const body = row.label === "Sun"
                      ? `${selectedChart.displayName}'s core self and vitality`
                      : row.label === "Moon"
                        ? `${selectedChart.displayName}'s inner world and what they need to feel safe`
                        : selectedChart.birthTimeUnknown
                          ? "Add a birth time to confirm the rising sign."
                          : `How ${selectedChart.displayName} meets the world and comes across`;
                    const canOpenDetail = Boolean(selectedChart.natalChart && !row.sign.toLowerCase().includes("pending"));

                    return (
                      <PlacementTableRow
                        description={body}
                        dignity={dignitiesFor(row.label, row.sign)}
                        glyph={row.glyph}
                        key={row.id}
                        onClick={canOpenDetail ? () => openFriendNatalPlacementDetail(row) : undefined}
                        pointName={row.label}
                        retrograde={row.retrograde}
                        title={title}
                        variant="friend"
                      />
                    );
                  })}
                </div>
                {selectedChart.natalChart && (
                  <>
                    <span className="eyebrow section-label friend-section-label">{selectedChartIsEvent ? "Event placements" : `${selectedChart.displayName}'s natal placements`}</span>
                    <FriendPlacementTable
                      title={selectedChartIsEvent ? "Event placements" : `${selectedChart.displayName}'s natal placements`}
                      rows={selectedFriendNatalPlacementRows}
                      descriptionContext={selectedChartIsEvent ? "chart" : "person"}
                      generatedContent={relationshipGeneratedContent}
                      generatedContext="natal"
                      onPlacementClick={openFriendNatalPlacementDetail}
                      ownerName={selectedChart.displayName}
                      showTitle={false}
                    />
                    {selectedFriendEmptyHouses.length > 0 && (
                      <>
                        <span className="eyebrow section-label friend-section-label">Empty houses</span>
                        <div className="list you-list-card planet-placement-list" aria-label={`${selectedChart.displayName} empty houses`}>
                          {selectedFriendEmptyHouses.map((house) => {
                            const friendNatalChart = selectedChart.natalChart;

                            if (!friendNatalChart) {
                              return null;
                            }

                            const houseSign = signAtWholeSignHouse(friendNatalChart.ascendant, house);

                            return (
                              <PlacementTableRow
                                ariaLabel={`Read more about ${emptyHouseTitle(house, friendNatalChart)}`}
                                description={emptyHouseCardDescription(house, friendNatalChart, "friend", selectedChart.displayName)}
                                glyph={houseSign ? zodiacSignGlyphs[houseSign] ?? "○" : "○"}
                                house={house}
                                key={`friend-empty-house-${house}`}
                                onClick={() => openFriendEmptyHouseDetail(house)}
                                title={emptyHouseTitle(house, friendNatalChart)}
                                variant="friend"
                              />
                            );
                          })}
                        </div>
                      </>
                    )}
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
                        const generated = liveGeneratedContentByKeys(
                          relationshipGeneratedContent,
                          [contentKey],
                          {
                            contentKey: templateFallbackContentKeys.youNatalAspect,
                            slots: aspectTemplateSlots(aspect.from, aspect.type, aspect.to),
                            afterContentFallback: content
                          }
                        );
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
                          <InlineGlyphIcon fallback={contact.friendPoint.glyph} href={zodiacAssetHref(pointIconFiles[contact.friendPoint.name])} label={contact.friendPoint.name} preferTextGlyph />
                          <InlineGlyphIcon fallback={aspectGlyph(contact.aspect)} href={zodiacAssetHref(aspectIconFiles[normalizeAspectType(contact.aspect)])} label={contact.aspect} preferTextGlyph />
                          <InlineGlyphIcon fallback={contact.yourPoint.glyph} href={zodiacAssetHref(pointIconFiles[contact.yourPoint.name])} label={contact.yourPoint.name} preferTextGlyph />
                        </span>
                        <span className="aspect-row-copy">
                          <h3>{title}</h3>
                          <span className="aspect-row-subtitle ui-pill ui-pill--muted">{subtitle}</span>
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
                      rows={compositePlacementRows(selectedCompositeSky, relationshipGeneratedContent)}
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
                          <span className="aspect-row-subtitle ui-pill ui-pill--muted">{relationshipThemeTitle(aspect.from, aspect.to, aspect.type)}</span>
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
