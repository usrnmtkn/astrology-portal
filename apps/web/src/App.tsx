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
import { Fragment, isValidElement, lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode, Ref } from "react";
import { buildAnnualTimingContext, rankTransits } from "@tldr/astro-knowledge/timing-engine";
import type { TraditionalPlanet, ZodiacSign } from "@tldr/astro-knowledge/timing-engine";
import { FriendsPageShell } from "./components/FriendsPageShell";
import { ModalPortal } from "./components/ModalPortal";
import { ProfileAvatar, profileInitials } from "./components/ProfileAvatar";
import { SegmentedControl } from "./components/SegmentedControl";
import { AppearanceToggle, HouseSignLabelToggle, SwitchControl } from "./components/SettingsControls";
import { CareerArchetypeCard } from "./components/charts/CareerArchetypeCard";
import { NatalChartDataTable, type NatalChartDataTableRow } from "./components/charts/NatalChartDataTable";
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
  natalPlacementDescription as placementRowDescription,
  placementPlanetOrder,
  placementDignity,
  socialPlacementRows
} from "./components/charts/PlacementRows";
import { resolveSoulRoadmapProfile, SoulRoadmapCard, type SoulRoadmapProfile } from "./components/charts/SoulRoadmapCard";
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
import { knowledgeIdsForFallbackHook, type FallbackHookContext } from "./content/fallbackHooks";
import skyContentSnapshot from "./content/skyContentSnapshot.json";
import compatibilityWriteupBank from "../../../tldr-astro-phrasebank/phrasebank/cc-compatibility-writeups.json";
import moonCompatibilityLibrary from "../../../tldr-astro-phrasebank/phrasebank/moon-compatibility-library.json";
import compatibilitySummaryBank from "../../../tldr-astro-phrasebank/phrasebank/cc-compatibility-cards.json";
import synastryWebBundle from "../../../tldr-astro-phrasebank/phrasebank/cc-synastry-web-bundle.json";
import {
  normalizeAspect as normalizeFallbackV3Aspect,
  SourceGapError as FallbackV3SourceGapError
} from "./content/fallbackArchitectureV3Runtime";
import {
  installFallbackArchitectureV3Bundle,
  fallbackRendererV3,
  transitSynastryFallbackRendererV3,
  fallbackV3AspectFeel,
  fallbackV3HouseTopic,
  fallbackV3PlanetTopic,
  fallbackV3SignRuler,
  fallbackV3SignStyle,
  transitV3SameBeatKeyForContentKey
} from "./content/fallbackArchitectureV3Runtime";
import { firstReaderFacingCopy, isReaderFacingCopy, readerFacingParagraphs } from "./content/readerSafety";
import {
  placementScaffoldHasMinimumCoverage,
  placementScaffoldSections,
  type PlacementScaffoldSection
} from "./content/placementScaffold";
import {
  sourceGroundedNatalPlacementSections as sourceGroundedNatalPlacementSectionsRuntime
} from "./content/sourceGroundedRuntime";
import { resolveSourceGroundedV2 } from "./content/sourceGroundedV2";
import {
  resolveSkyHistoricalLookback,
  skyHistoricalLookbackSettingKey,
  type SkyHistoricalLookback
} from "./content/skyHistoricalLookback";
import { formatSkyWritingAspectBeat, resolveSkyWritingArticle, type SkyWritingAspectBeat } from "./content/skyWriting";
import type { ContentBundle } from "./content/types";
import type { RelationshipChartFullscreenMode } from "./features/friends/RelationshipChartFullscreen";
import type { RelationshipComparisonOption } from "./features/friends/RelationshipComparePicker";
import { CompatibilityTab, type CompatibilityPlanetCard } from "./features/friends/CompatibilityTab";
import type { CompatibilityDynamic } from "./features/friends/CompatibilityTab";
import { NatalAspectPatternActivationsSection, NatalAspectPatternsSection } from "./features/you/NatalAspectPatternsSection";
import type { LunarCalendarEvent } from "./services/ephemeris";
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
  generatedContentSections,
  generatedContentParagraphs,
  generatedContentPreviewModeChangeEvent,
  loadFallbackArchitectureV3DashboardBundle,
  loadLiveGeneratedContent,
  loadLiveGeneratedContentForSurfaces,
  readGeneratedContentPreviewMode,
  renderGeneratedContentTemplate,
  type GeneratedContentPreviewMode,
  type GeneratedContentDrilldown,
  type LiveGeneratedContent
} from "./services/generatedContent";
import { validateAstrologyFacts } from "./services/astrologyFacts";
import { loadCareerVocabulary, resolveCareerArchetypeProfile, type CareerArchetypeProfile } from "./services/careerArchetype";
import { loadNatalCardTaglines, natalCardTagline } from "./services/natalPlacementTaglines";
import { loadPlanetTopicVocabulary, planetTopicPhrase, signNeedPhrase, signStylePhrase, signStyleShortPhrase, type PlanetTopicVariant } from "./services/planetTopicVocabulary";
import type { TemplateSlotValues } from "./services/templateInterpolation";
import {
  compositeAspectContentKey,
  compositeHouseContentKey,
  compositePointContentKey,
  compositeSignContentKey,
  natalAngleContentKey,
  natalAspectContentKey,
  natalHouseContentKey,
  natalPlacementContentKey,
  natalRulerContentKey,
  natalSignContentKey,
  synastryAspectContentKey,
  transitHouseContentKey
} from "./services/generatedContentKeys";
import {
  isSamePlanetSynastryContact,
  samePlanetSynastryAspectFamily,
  samePlanetSynastryContentKeys,
  samePlanetSynastryRuntimeFallbackKey
} from "./services/samePlanetSynastry";
import {
  createManualChart,
  deleteManualChart,
  listCachedManualCharts,
  listLocalManualChartUserIds,
  listManualCharts,
  migrateLocalManualChartsToRemote,
  updateManualChart
} from "./services/manualCharts";
import type { ManualChart, ManualChartInput, ManualChartType } from "./services/manualCharts";
import {
  fetchNatalAspectPatternsWithCopy,
  natalAspectPatternActivationEnabled,
  natalAspectPatternReaderEnabled,
  natalAspectPatternReaderItems,
  natalAspectPatternReaderStatus,
  skyWithNatalAspectPatternCopy
} from "./services/natalAspectPatterns";
import type { NatalAspectPatternActivationTimingWindow, NatalAspectPatternReaderItem } from "./services/natalAspectPatterns";
import { relationshipContextFromRole, relationshipContextLabel, normalizeRelationshipContextKey, isExplicitRomanticRelationship, relationshipContextGroup } from "./services/relationshipContext";
import {
  defaultPronounChoice,
  genericPersonReferenceSlots,
  normalizePronounChoice,
  personReferenceSlots,
  possessiveName,
  resolvePersonReference,
  resolveThirdPersonReference,
  type PersonReference,
  type PronounChoice
} from "./services/personReferences";
import { hasMapboxToken, reverseGeocodeCity, searchCities } from "./services/mapbox";
import { getInitialAccountMode } from "./services/session";
import { browserTimeZone, timeZoneForLocation, withTimeZone, zonedDateTimeToUtc } from "./services/timezones";
import {
  compareRelationship,
  getPersonalTiming,
  isTldrAstroApiConfigured,
  resolveTimezone,
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
  houseSystem: "Whole Sign";
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
  pronouns: PronounChoice;
  relationshipType: string;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  birthPlace: string;
  birthLocation: LocationInput | null;
};

type ChartOwnerContext = {
  ownerName: string;
  ownerKind?: "person" | "chart";
  ownerPronouns?: PronounChoice | null;
};

type TransitItem = {
  id: string;
  term: TransitTerm;
  glyph: string;
  transitPlanet: string;
  transitSign?: string;
  transitMotion?: "direct" | "retrograde";
  aspect: string;
  natalPoint: string;
  natalSign: string;
  natalHouse?: number;
  orb: string;
  direction?: TransitDirection;
  arc: number[];
  note: string;
  score?: number;
  significance?: string;
  timingBonuses?: string[];
  isSlowGeneralWeather?: boolean;
};

type PersonalTimingStatus = "idle" | "loading" | "ready" | "error";
type RelationshipCompareStatus = "idle" | "loading" | "ready" | "error";

type FriendProfileTab = "compatibility" | "transits" | "natal" | "synastry" | "composite";
type NatalChartViewMode = "circle" | "table";
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

type SurfaceProseLayer = "authored" | "fallback";
type NormalizedSurfaceStatus = "servable" | "partial" | "not-servable";

type NormalizedSurfaceSection<Slot extends string = string> = {
  slot: Slot;
  required: boolean;
  layer: SurfaceProseLayer;
  tier: string;
  sourceKeys: string[];
  body: string;
};

type NormalizedSurfaceArticle<Surface extends string = string, Slot extends string = string> = {
  surface: Surface;
  status: NormalizedSurfaceStatus;
  sections: NormalizedSurfaceSection<Slot>[];
};

function contentSourceQaTag(section: Pick<NormalizedSurfaceSection<string>, "layer">) {
  void section;

  return "";
}

function taggedSectionBody(section: Pick<NormalizedSurfaceSection<string>, "body" | "layer" | "tier">) {
  const tag = contentSourceQaTag(section);

  return tag ? `${tag}\n\n${section.body}` : section.body;
}

function taggedSectionParagraphs(section: Pick<NormalizedSurfaceSection<string>, "body" | "layer" | "tier">) {
  const paragraphs = readerFacingParagraphs([section.body]);
  const tag = contentSourceQaTag(section);

  return tag && paragraphs.length > 0 ? [tag, ...paragraphs] : paragraphs;
}

type SynastryContactSlot = "scene";
type NormalizedSynastryContactArticle = NormalizedSurfaceArticle<"synastry-contact", SynastryContactSlot>;

type NatalPlacementSlot = "angle" | "sign" | "house" | "ruler" | "retrograde" | "aspect";
type NormalizedNatalPlacementSection = NormalizedSurfaceSection<NatalPlacementSlot> & {
  heading: string;
  aspectType?: string;
  group?: AspectToneBucket;
};
type NormalizedNatalPlacementArticle = {
  surface: "natal-placement";
  status: NormalizedSurfaceStatus;
  sections: NormalizedNatalPlacementSection[];
};

type NatalAspectSlot = "meaning";
type NormalizedNatalAspectSection = NormalizedSurfaceSection<NatalAspectSlot> & {
  heading: string;
};
type NormalizedNatalAspectArticle = {
  surface: "natal-aspect";
  status: NormalizedSurfaceStatus;
  sections: NormalizedNatalAspectSection[];
};

type SkyAspectSlot = "meaning";
type NormalizedSkyAspectSection = NormalizedSurfaceSection<SkyAspectSlot> & {
  heading: string;
};
type NormalizedSkyAspectArticle = {
  surface: "sky-aspect";
  status: NormalizedSurfaceStatus;
  sections: NormalizedSkyAspectSection[];
};

type SkyPlacementSlot = "meaning";
type NormalizedSkyPlacementSection = NormalizedSurfaceSection<SkyPlacementSlot> & {
  heading: string;
};
type NormalizedSkyPlacementArticle = {
  surface: "sky-placement";
  status: NormalizedSurfaceStatus;
  sections: NormalizedSkyPlacementSection[];
};

type PersonalTransitSlot = "meaning";
type NormalizedPersonalTransitSection = NormalizedSurfaceSection<PersonalTransitSlot> & {
  heading: string;
};
type NormalizedPersonalTransitArticle = {
  surface: "personal-transit";
  status: NormalizedSurfaceStatus;
  sections: NormalizedPersonalTransitSection[];
};

type TransitHouseSlot = "house-activation";
type NormalizedTransitHouseSection = NormalizedSurfaceSection<TransitHouseSlot> & {
  heading: string;
};
type NormalizedTransitHouseArticle = {
  surface: "transit-house";
  status: NormalizedSurfaceStatus;
  sections: NormalizedTransitHouseSection[];
};

type HouseOverlaySlot = "overlay-meaning";
type NormalizedHouseOverlaySection = NormalizedSurfaceSection<HouseOverlaySlot> & {
  heading: string;
};
type NormalizedHouseOverlayArticle = {
  surface: "house-overlay";
  status: NormalizedSurfaceStatus;
  sections: NormalizedHouseOverlaySection[];
};

type CompositeSlot = "composite-meaning";
type NormalizedCompositeSection = NormalizedSurfaceSection<CompositeSlot> & {
  heading: string;
};
type NormalizedCompositeArticle = {
  surface: "composite";
  status: NormalizedSurfaceStatus;
  sections: NormalizedCompositeSection[];
};

type CompatibilityCardSlot = "function" | "your-line" | "their-line" | "same-sign-line" | "verdict";
type NormalizedCompatibilityCardSection = NormalizedSurfaceSection<CompatibilityCardSlot> & {
  heading: string;
};
type NormalizedCompatibilityCardArticle = {
  surface: "compatibility-card";
  status: NormalizedSurfaceStatus;
  sections: NormalizedCompatibilityCardSection[];
};

type AuthoredSynastryBundleEntry = {
  id: string;
  planetA: string;
  planetB: string;
  aspect: string;
  summaryShort?: string;
  summaryDeep?: string;
  status?: string;
  tier?: string;
};

type AuthoredSynastryBundle = {
  synastryAspects: AuthoredSynastryBundleEntry[];
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
type AspectToneBucket = "gifts" | "lessons";
type SkyDetailRelatedAspectRow = {
  key: string;
  aspectType?: string;
  group?: AspectToneBucket;
  node: ReactNode;
};
type SkyDetailSection = {
  heading: string;
  body: ReactNode;
  sourceTag?: string;
  sourceKeys?: string[];
  role?: "main" | "aspect";
  aspectType?: string;
  group?: AspectToneBucket;
};
type SkyDetail = {
  routePath?: string;
  glyph: string;
  kicker: string;
  title: string;
  meta: string;
  duration?: string;
  subtitle?: string;
  tldr?: string;
  suppressTldr?: boolean;
  lensHint?: ReactNode;
  compactHeader?: boolean;
  plainBody?: boolean;
  bodyBeforeSections?: boolean;
  retrograde?: boolean;
  body: ReactNode[];
  sections?: SkyDetailSection[];
  relatedAspects?: {
    heading: string;
    rows: Array<ReactNode | SkyDetailRelatedAspectRow>;
  };
  historicalLookback?: SkyHistoricalLookback | null;
  astrologyDrilldown?: GeneratedContentDrilldown | null;
  content?: ContentBundle;
};

function isSkyDetail(value: unknown): value is SkyDetail {
  return Boolean(value && typeof value === "object" && "title" in value && "body" in value);
}

type GeneratedContentMap = Map<string, LiveGeneratedContent>;

type LocalSkySnapshotRow = Omit<LiveGeneratedContent, "mode" | "blockType"> & {
  aliases?: string[];
  mode: LiveGeneratedContent["mode"];
  blockType?: LiveGeneratedContent["blockType"];
};

const legacyPublicLiveWritingEnabled = false;

function sourceGroundedNatalPlacementSections(
  ...args: Parameters<typeof sourceGroundedNatalPlacementSectionsRuntime>
) {
  return sourceGroundedNatalPlacementSectionsRuntime(...args);
}

type YouTransitArticle = {
  id: string;
  title: string;
  glyph?: string;
  subtitle: string;
  tldr?: string;
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
    sourceTag?: string;
    sourceKeys?: string[];
    role?: "main" | "aspect";
    aspectType?: string;
    group?: AspectToneBucket;
  }>;
  relatedAspects?: {
    heading: string;
    rows: ReactNode[];
  };
  historicalLookback?: SkyHistoricalLookback | null;
  meta: Array<{
    label: string;
    value: string;
  }>;
};

function careerDetailSections(profile: CareerArchetypeProfile) {
  return profile.sections.map((section) => ({
    heading: section.label,
    body: section.body
  }));
}

function careerYouArticle(profile: CareerArchetypeProfile): YouTransitArticle {
  return {
    id: "career-archetype",
    title: profile.title,
    glyph: "♔",
    subtitle: profile.tldr,
    tldr: profile.tldr,
    summary: profile.summary,
    summaryHeading: "Career pattern",
    bodyBeforeSections: false,
    sections: careerDetailSections(profile).map((section) => ({
      heading: section.heading,
      tldr: "",
      body: section.body
    })),
    meta: profile.factors
  };
}

function careerSkyDetail(profile: CareerArchetypeProfile, routePath?: string): SkyDetail {
  return {
    routePath,
    glyph: "♔",
    kicker: "Career",
    title: profile.title,
    meta: "Career pattern",
    subtitle: profile.tldr,
    tldr: profile.tldr,
    compactHeader: true,
    body: [profile.summary],
    sections: careerDetailSections(profile)
  };
}

function soulRoadmapYouArticle(profile: SoulRoadmapProfile): YouTransitArticle {
  return {
    id: "soul-roadmap",
    title: profile.title,
    glyph: "✦",
    subtitle: profile.tldr,
    tldr: profile.tldr,
    summary: profile.tldr,
    summaryHeading: profile.label,
    bodyBeforeSections: false,
    sections: profile.sections.map((section) => ({
        heading: section.heading,
        tldr: "",
        body: section.body
      })),
    meta: profile.points
  };
}

function soulRoadmapSkyDetail(profile: SoulRoadmapProfile, routePath?: string): SkyDetail {
  return {
    routePath,
    glyph: "✦",
    kicker: profile.label,
    title: profile.title,
    meta: "Purpose pattern",
    subtitle: profile.tldr,
    tldr: profile.tldr,
    compactHeader: true,
    body: [],
    sections: profile.sections
  };
}

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
let contentRegistryRevision = 0;

function subscribeContentRegistry(listener: () => void) {
  contentRegistryListeners.add(listener);

  return () => {
    contentRegistryListeners.delete(listener);
  };
}

function notifyContentRegistryListeners() {
  contentRegistryRevision += 1;
  contentRegistryListeners.forEach((listener) => listener());
}

function useContentRegistryRevision() {
  const [version, setVersion] = useState(contentRegistryRevision);

  useEffect(() => {
    setVersion(contentRegistryRevision);

    return subscribeContentRegistry(() => {
      setVersion(contentRegistryRevision);
    });
  }, []);

  return version;
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

function canonicalAspectDisplayKey(aspect: SkySnapshot["aspects"][number]) {
  const points = [normalizeContentIdPart(aspect.from), normalizeContentIdPart(aspect.to)].sort();

  return `${points[0]}-${normalizeContentIdPart(aspect.type)}-${points[1]}`;
}

function uniqueNatalAspectRows(aspects: SkySnapshot["aspects"]) {
  const seen = new Set<string>();

  return aspects.filter((aspect) => {
    const key = canonicalAspectDisplayKey(aspect);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
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

    return sanitizeContentFallback({
      ...fallback,
      detailParagraphs: fallback.detailParagraphs ?? []
    });
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

function sanitizeContentFallback(content: ContentFallback): ContentFallback {
  const summary = firstReaderFacingCopy([content.summary]);
  const bodyParagraphs = readerFacingParagraphs(content.body?.split(/\n{2,}/) ?? []);
  const detailParagraphs = readerFacingParagraphs(content.detailParagraphs);

  return {
    ...content,
    summary: summary ?? null,
    body: bodyParagraphs.length > 0 ? bodyParagraphs.join("\n\n") : null,
    detailParagraphs
  };
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

function hasReaderFacingGeneratedCopy(content: LiveGeneratedContent | null) {
  if (!content) {
    return false;
  }

  return Boolean(
    firstReaderFacingCopy([content.summary])
    || generatedContentParagraphs(content).length > 0
    || generatedContentSections(content).length > 0
  );
}

function liveGeneratedContent(generatedContent: GeneratedContentMap, contentKey: string, templateSlots?: TemplateSlotValues) {
  const content = renderGeneratedContentTemplate(generatedContent.get(contentKey), templateSlots);

  return hasReaderFacingGeneratedCopy(content) ? content : null;
}

const templateFallbackContentKeys = {
  skySeasonalCurrent: "fallback-hook/sky.seasonal-current",
  skyLunarCycle: "fallback-hook/sky.lunar-cycle",
  skyPlanetaryPlacement: "fallback-hook/sky.planetary-placement",
  skyPlanetaryPlacementRetrograde: "fallback-hook/sky.planetary-placement-retrograde",
  skyIngress: "fallback-hook/sky.ingress",
  skyAspectDetail: "fallback-hook/sky.aspect-detail",
  skyAspectRow: "fallback-hook/sky.aspect-row",
  skyRetrograde: "fallback-hook/sky.retrograde",
  skyStation: "fallback-hook/sky.station",
  skyRetrogradeSection: "fallback-hook/sky.retrograde-section",
  youNatalPlacement: "fallback-hook/you.natal-placement",
  youNatalHousePlacement: "fallback-hook/you.natal-house-placement",
  youNatalAnglePlacement: "fallback-hook/you.natal-angle-placement",
  youNatalRuler: "fallback-hook/you.natal-ruler",
  youNatalChartRuler: "fallback-hook/you.natal-chart-ruler",
  youNatalSynthesis: "fallback-hook/you.natal-synthesis",
  youNatalAspect: "fallback-hook/you.natal-aspect",
  youTransitToNatal: "fallback-hook/you.transit-to-natal",
  youTransitThroughHouse: "fallback-hook/you.transit-through-house",
  youTransitToAngle: "fallback-hook/you.transit-to-angle",
  youDailyTiming: "fallback-hook/you.daily-timing",
  friendsSynastryContact: "fallback-hook/friends.synastry-contact",
  friendsSamePlanet: samePlanetSynastryRuntimeFallbackKey,
  friendsHouseOverlay: "fallback-hook/friends.house-overlay",
  friendsCompositeAspect: "fallback-hook/friends.composite-aspect",
  friendsCompositePlacement: "fallback-hook/friends.composite-placement",
  friendsRelationshipTiming: "fallback-hook/friends.relationship-timing",
  friendsCircleFeed: "fallback-hook/friends.circle-feed",
  settingsLifeAreaFocus: "fallback-hook/settings.life-area-focus"
} as const;

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

function normalizedSkySnapshotContentMap() {
  const map: GeneratedContentMap = new Map();

  if (!legacyPublicLiveWritingEnabled) {
    return map;
  }

  const rows = (skyContentSnapshot as { rows?: LocalSkySnapshotRow[] }).rows ?? [];

  rows.forEach((row) => {
    const content: LiveGeneratedContent = {
      id: row.id,
      contentKey: row.contentKey,
      surface: row.surface,
      mode: row.mode,
      eventType: row.eventType,
      targetDate: row.targetDate,
      headline: row.headline,
      summary: row.summary,
      body: row.body,
      sections: row.sections,
      blockType: row.blockType ?? null,
      provider: row.provider ?? null,
      sourceSnapshot: row.sourceSnapshot ?? null,
      model: row.model,
      updatedAt: row.updatedAt
    };

    map.set(content.contentKey, content);
    (row.aliases ?? []).forEach((alias) => {
      if (!map.has(alias)) {
        map.set(alias, content);
      }
    });
  });

  return map;
}

const normalizedSkySnapshotContent = normalizedSkySnapshotContentMap();

function relationshipKnowledgeFallbackByKeys(
  contentKeys: string[],
  options: { allowKnowledgeOnly?: boolean } = {}
) {
  const allowKnowledgeOnly = options.allowKnowledgeOnly ?? false;

  for (const contentKey of contentKeys) {
    const authoredFallback = authoredSynastryFallbackById(contentKey);

    if (authoredFallback) {
      return authoredFallback;
    }

    const fallback = approvedVoiceOrKnowledgeFallback(contentKey, "relationship", allowKnowledgeOnly);

    if (fallback.summary || fallback.body || fallback.detailParagraphs.length > 0) {
      return fallback;
    }
  }

  return null;
}

function contentFallbackParagraphs(fallback: ContentFallback | null | undefined) {
  if (!fallback) {
    return [];
  }

  return readerFacingParagraphs([
    fallback.body,
    ...fallback.detailParagraphs,
    fallback.summary
  ]);
}

const authoredSynastryEntriesById = new Map(
  (synastryWebBundle as AuthoredSynastryBundle).synastryAspects.map((entry) => [entry.id, entry])
);
function authoredSynastryEntry(firstPoint: string, aspect: string, secondPoint: string) {
  const id = synastryAuthoredContentId(firstPoint, aspect, secondPoint);

  return authoredSynastryEntriesById.get(id) ?? null;
}

function synastryAuthoredContentId(firstPoint: string, aspect: string, secondPoint: string) {
  return `A-${normalizeContentIdPart(firstPoint)}_B-${normalizeContentIdPart(secondPoint)}_${normalizeContentIdPart(aspect)}`;
}

function authoredSynastryFallbackById(id: string): ContentFallback | null {
  const entry = authoredSynastryEntriesById.get(id);

  return entry ? authoredSynastryFallback(entry.planetA, entry.aspect, entry.planetB) : null;
}

function authoredSynastryFallback(firstPoint: string, aspect: string, secondPoint: string): ContentFallback | null {
  const entry = authoredSynastryEntry(firstPoint, aspect, secondPoint);

  if (!entry) {
    return null;
  }

  const detail = firstReaderFacingCopy([entry.summaryDeep, entry.summaryShort]);
  const summary = firstReaderFacingCopy([entry.summaryShort, entry.summaryDeep]);

  if (!summary && !detail) {
    return null;
  }

  return sanitizeContentFallback({
    ...emptyContentFallback(entry.id),
    bundle: {
      id: entry.id,
      knowledge: null,
      voice: null,
      status: "MISSING_VOICE"
    },
    summary,
    body: detail,
    detailParagraphs: detail ? [detail] : []
  });
}

function contentFallbackPreview(content: ContentFallback | null | undefined) {
  return content?.summary
    || content?.body
    || content?.detailParagraphs[0]
    || null;
}

function synastryEmergencyMadlibContent(
  friendName: string,
  comparisonName: string,
  comparisonIsSelf: boolean,
  contact: Omit<SynastryContact, "summary">,
  generatedContent?: GeneratedContentMap,
  friendPronouns?: PronounChoice | null,
  comparisonPronouns?: PronounChoice | null,
  relationshipType?: string | null
) {
  if (!generatedContent) {
    return null;
  }

  const isSamePlanetContact = isSamePlanetSynastryContact(contact.friendPoint.name, contact.yourPoint.name);
  const contentKey = isSamePlanetContact
    ? templateFallbackContentKeys.friendsSamePlanet
    : templateFallbackContentKeys.friendsSynastryContact;
  const slots = {
    ...synastryTemplateSlots(
      friendName,
      contact.friendPoint.name,
      contact.aspect,
      comparisonName,
      contact.yourPoint.name,
      "friend",
      {
        personAPronouns: friendPronouns,
        personBPronouns: comparisonPronouns,
        personBIsReader: comparisonIsSelf
      }
    ),
    planet: contact.friendPoint.name,
    planetTopic: relationshipPlanetTopicSlot(contact.friendPoint.name, "friend"),
    aspectFamily: samePlanetSynastryAspectFamily(contact.aspect),
    relationshipContext: relationshipContextNoun(relationshipType),
    orb: wholeDegreeOrb(contact.orb)
  };

  return liveGeneratedContent(generatedContent, contentKey, slots);
}

function synastryEmergencyMadlibPreview(
  friendName: string,
  comparisonName: string,
  comparisonIsSelf: boolean,
  contact: Omit<SynastryContact, "summary">,
  generatedContent?: GeneratedContentMap,
  friendPronouns?: PronounChoice | null,
  comparisonPronouns?: PronounChoice | null,
  relationshipType?: string | null
) {
  const madlib = synastryEmergencyMadlibContent(
    friendName,
    comparisonName,
    comparisonIsSelf,
    contact,
    generatedContent,
    friendPronouns,
    comparisonPronouns,
    relationshipType
  );
  const paragraphs = generatedContentParagraphs(madlib);

  return paragraphs[0] || firstReaderFacingCopy([madlib?.body]) || null;
}

function repairSynastrySurfaceCopy(
  text: string,
  friendName: string,
  comparisonName: string,
  comparisonIsSelf: boolean,
  contact: Omit<SynastryContact, "summary">,
  romanticAllowed: boolean,
  relationshipType?: string | null
) {
  return repairRelationshipFallbackGrammar(
    relationshipGeneratedCopyForPerspective(
      text,
      friendName,
      comparisonName,
      comparisonIsSelf
    ),
    {
      primaryName: friendName,
      comparisonName,
      comparisonIsSelf,
      primaryPoint: contact.friendPoint.name,
      comparisonPoint: contact.yourPoint.name,
      aspect: contact.aspect,
      romanticAllowed,
      relationshipType
    }
  );
}

function authoredSynastrySection(contact: Omit<SynastryContact, "summary">): NormalizedSurfaceSection<SynastryContactSlot> | null {
  for (const contentKey of contact.contentKeys) {
    const entry = authoredSynastryEntriesById.get(contentKey);
    const body = entry ? firstReaderFacingCopy([entry.summaryDeep, entry.summaryShort]) : null;

    if (entry && body) {
      return {
        slot: "scene",
        required: true,
        layer: "authored",
        tier: entry.tier ?? "authored-draft",
        sourceKeys: [
          "cc-synastry-web-bundle",
          entry.id,
          `status=${entry.status ?? "unknown"}`
        ],
        body
      };
    }
  }

  return null;
}

function registrySynastrySection(contact: Omit<SynastryContact, "summary">): NormalizedSurfaceSection<SynastryContactSlot> | null {
  const fallback = relationshipKnowledgeFallbackByKeys(contact.contentKeys);
  const body = fallback ? firstReaderFacingCopy([
    ...fallback.detailParagraphs,
    fallback.body,
    fallback.summary
  ]) : null;

  if (!fallback || !body) {
    return null;
  }

  return {
    slot: "scene",
    required: true,
    layer: "fallback",
    tier: fallback.bundle.knowledge?.status ?? fallback.bundle.status,
    sourceKeys: [
      ...(fallback.bundle.knowledge?.sources ?? []),
      fallback.bundle.knowledge?.id ?? fallback.bundle.id
    ].filter(Boolean),
    body
  };
}

function madlibSynastrySection(
  friendName: string,
  comparisonName: string,
  comparisonIsSelf: boolean,
  contact: Omit<SynastryContact, "summary">,
  generatedContent?: GeneratedContentMap,
  friendPronouns?: PronounChoice | null,
  comparisonPronouns?: PronounChoice | null,
  relationshipType?: string | null
): NormalizedSurfaceSection<SynastryContactSlot> | null {
  const madlib = synastryEmergencyMadlibContent(
    friendName,
    comparisonName,
    comparisonIsSelf,
    contact,
    generatedContent,
    friendPronouns,
    comparisonPronouns,
    relationshipType
  );
  const body = firstReaderFacingCopy([
    ...generatedContentParagraphs(madlib),
    madlib?.body,
    madlib?.summary
  ]);

  if (!madlib || !body) {
    return null;
  }

  return {
    slot: "scene",
    required: true,
    layer: "fallback",
    tier: "source-based-madlib",
    sourceKeys: [
      madlib.contentKey,
      generatedContentSourceFile(madlib)
    ].filter(Boolean),
    body
  };
}

function normalizeSynastryContactSurface(
  friendName: string,
  comparisonName: string,
  comparisonIsSelf: boolean,
  contact: Omit<SynastryContact, "summary">,
  generatedContent?: GeneratedContentMap,
  friendPronouns?: PronounChoice | null,
  comparisonPronouns?: PronounChoice | null,
  romanticAllowed = false,
  relationshipType?: string | null
): NormalizedSynastryContactArticle {
  const section = authoredSynastrySection(contact)
    ?? registrySynastrySection(contact)
    ?? madlibSynastrySection(
      friendName,
      comparisonName,
      comparisonIsSelf,
      contact,
      generatedContent,
      friendPronouns,
      comparisonPronouns,
      relationshipType
    );
  const repairedSection = section
    ? {
      ...section,
      body: repairSynastrySurfaceCopy(
        section.body,
        friendName,
        comparisonName,
        comparisonIsSelf,
        contact,
        romanticAllowed,
        relationshipType
      )
    }
    : null;

  return {
    surface: "synastry-contact",
    status: repairedSection ? "servable" : "not-servable",
    sections: repairedSection ? [repairedSection] : []
  };
}

function generatedContentSourceFile(content: LiveGeneratedContent | null) {
  const file = content?.sourceSnapshot?.file;
  const sourceFile = content?.sourceSnapshot?.sourceFile;

  return typeof file === "string"
    ? file
    : typeof sourceFile === "string"
      ? sourceFile
      : "";
}

function signStyleSlot(sign: string) {
  return signStylePhrase(sign) || fallbackV3SignStyle(sign);
}

function planetTopicSlot(planet: string, variant: PlanetTopicVariant = "natal") {
  return planetTopicPhrase(planet, variant) || fallbackV3PlanetTopic(planet);
}

const relationshipPlanetTopicFallbacks: Record<string, string> = {
  Sun: fallbackV3PlanetTopic("Sun"),
  Moon: fallbackV3PlanetTopic("Moon"),
  Mercury: fallbackV3PlanetTopic("Mercury"),
  Venus: fallbackV3PlanetTopic("Venus"),
  Mars: fallbackV3PlanetTopic("Mars"),
  Jupiter: fallbackV3PlanetTopic("Jupiter"),
  Saturn: fallbackV3PlanetTopic("Saturn"),
  Uranus: fallbackV3PlanetTopic("Uranus"),
  Neptune: fallbackV3PlanetTopic("Neptune"),
  Pluto: fallbackV3PlanetTopic("Pluto"),
  Chiron: fallbackV3PlanetTopic("Chiron"),
  Ascendant: fallbackV3PlanetTopic("Ascendant"),
  Midheaven: fallbackV3PlanetTopic("Midheaven"),
  "North Node": fallbackV3PlanetTopic("North Node"),
  "True Node": fallbackV3PlanetTopic("True Node")
};

function relationshipPlanetTopicSlot(planet: string, variant: PlanetTopicVariant = "friend") {
  const phrase = planetTopicSlot(planet, variant).trim();

  if (!phrase || /^(how|where|what)\s+(a person|someone|you|your)\b/i.test(phrase)) {
    return relationshipPlanetTopicFallbacks[planet] ?? phrase;
  }

  return phrase;
}

function skyPlacementTemplateSlots(position: PlanetPosition): TemplateSlotValues {
  const body = skyDisplayPlanetName(position.planet);
  const planetTopic = planetTopicSlot(position.planet, "sky");
  const signStyle = signStyleSlot(position.sign);
  const transitTiming = position.transitStart && position.transitEnd
    ? formatTransitRange(new Date(position.transitStart), new Date(position.transitEnd))
    : null;
  const retrogradeTiming = retrogradeRangeText(position) ?? transitTiming;
  const compactCollectiveClaim = position.motion === "retrograde"
    ? `${body} retrograde in ${position.sign}.`
    : `${body} in ${position.sign}.`;

  return {
    body,
    compact_collective_claim: compactCollectiveClaim,
    end_date_display: retrogradeTiming?.split(/\s+[-–]\s+/u)[1] ?? "",
    is_retrograde: position.motion === "retrograde",
    planet: position.planet,
    planetTopic,
    sign: position.sign,
    signStyle,
    signNeed: position.planet === "Moon" ? signNeedPhrase(position.sign, "sky") : "",
    start_date_display: retrogradeTiming?.split(/\s+[-–]\s+/u)[0] ?? ""
  };
}

function skyRetrogradeTemplateSlots(position: PlanetPosition): TemplateSlotValues {
  const body = skyDisplayPlanetName(position.planet);
  const planetTopic = planetTopicSlot(position.planet, "sky");
  const timingParts = (retrogradeRangeText(position) ?? "").split(/\s+[-–]\s+/u);
  const reviewScene = `${body} retrograde in ${position.sign}`;
  const specificMaterial = planetTopic || "the thing that keeps returning";

  return {
    body,
    has_practical_action: false,
    planet: position.planet,
    planetTopic,
    premature_next_step: "a final plan",
    practical_action: "",
    review_scene: reviewScene,
    sign: position.sign,
    specific_material: specificMaterial,
    station_direct_date_display: timingParts[1] ?? "",
    station_retrograde_date_display: timingParts[0] ?? ""
  };
}

function skyPlacementFallbackChildKey(position: PlanetPosition) {
  const planetPart = normalizeContentIdPart(position.planet)
    .replace(/^true-node$/, "north-node")
    .replace(/^black-moon-lilith$/, "lilith");

  return `fallback-hook/sky.planetary-placement/${planetPart}/${normalizeContentIdPart(position.sign)}`;
}

function skyPlacementTemplateFallbackKey(position: PlanetPosition) {
  if (position.motion === "retrograde") {
    return templateFallbackContentKeys.skyPlanetaryPlacementRetrograde;
  }

  return templateFallbackContentKeys.skyPlanetaryPlacement;
}

function aspectTemplateSlots(
  firstPoint: string,
  aspect: string,
  secondPoint: string,
  variant: PlanetTopicVariant = "natal",
  person?: PersonReference
): TemplateSlotValues {
  return {
    aspect: titleCase(aspect).toLowerCase(),
    planetA: firstPoint,
    planetATopic: variant === "friend" ? relationshipPlanetTopicSlot(firstPoint, variant) : planetTopicSlot(firstPoint, variant),
    planetB: secondPoint,
    planetBTopic: variant === "friend" ? relationshipPlanetTopicSlot(secondPoint, variant) : planetTopicSlot(secondPoint, variant),
    ...(person ? genericPersonReferenceSlots(person) : {})
  };
}

function skyAspectSign(aspect: SkySnapshot["aspects"][number], point: string, positions?: PlanetPosition[]) {
  const signedAspect = aspect as SkySnapshot["aspects"][number] & { fromSign?: string; toSign?: string };

  if (point === aspect.from && signedAspect.fromSign) {
    return signedAspect.fromSign;
  }

  if (point === aspect.to && signedAspect.toSign) {
    return signedAspect.toSign;
  }

  return skyAspectPosition(point, positions)?.sign ?? "";
}

function skyAspectTemplateSlots(aspect: SkySnapshot["aspects"][number], positions?: PlanetPosition[]): TemplateSlotValues {
  const signA = skyAspectSign(aspect, aspect.from, positions);
  const signB = skyAspectSign(aspect, aspect.to, positions);

  return {
    ...aspectTemplateSlots(aspect.from, aspect.type, aspect.to, "sky"),
    signA,
    signAStyle: signA ? signStyleSlot(signA) : "",
    signAStyleShort: signA ? signStyleShortPhrase(signA) : "",
    signB,
    signBStyle: signB ? signStyleSlot(signB) : "",
    signBStyleShort: signB ? signStyleShortPhrase(signB) : ""
  };
}

function ownerPossessive(ownerContext?: ChartOwnerContext) {
  if (ownerContext?.ownerKind !== "chart" && ownerContext?.ownerName) {
    return resolveThirdPersonReference({
      name: ownerContext.ownerName,
      pronouns: ownerContext.ownerPronouns
    }).possessiveAdjectiveCapitalized;
  }

  return "Your";
}

function natalPlacementTemplateSlots(
  position: PlanetPosition,
  variant: PlanetTopicVariant = "natal",
  ownerContext?: ChartOwnerContext
): TemplateSlotValues {
  const houseNumber = position.house ?? null;

  return {
    possessive: ownerPossessive(ownerContext),
    planet: position.planet,
    point: position.planet,
    planetTopic: planetTopicSlot(position.planet, variant),
    pointFunction: planetTopicSlot(position.planet, variant),
    sign: position.sign,
    signStyle: signStyleSlot(position.sign),
    house: houseNumber ? ordinalHouse(houseNumber) : "",
    houseLifeArea: houseNumber ? houseLifeAreas[houseNumber] ?? "" : ""
  };
}

function natalAngleTemplateSlots(position: PlanetPosition): TemplateSlotValues {
  return {
    planet: position.planet,
    angle: position.planet,
    planetTopic: planetTopicSlot(position.planet, "you"),
    angleTopic: planetTopicSlot(position.planet, "you") || relationshipPlanetTopicFallbacks[position.planet] || "",
    sign: position.sign,
    signStyle: signStyleSlot(position.sign),
    house: position.house ? ordinalHouse(position.house) : "",
    birthTimeConfidence: "reliable"
  };
}

function natalRulerTemplateSlots(
  position: PlanetPosition,
  houseSign: string,
  houseRuler: string,
  rulerPosition: PlanetPosition,
  ownerContext?: ChartOwnerContext
): TemplateSlotValues {
  const rulerHouse = rulerPosition.house ?? null;

  return {
    ...natalPlacementTemplateSlots(position, "you", ownerContext),
    point: position.planet,
    sign: houseSign,
    ruler: houseRuler,
    rulerSign: rulerPosition.sign,
    rulerHouse: rulerHouse ? ordinalHouse(rulerHouse) : "",
    rulerTopic: planetTopicSlot(houseRuler, "you"),
    rulerFunction: planetTopicSlot(houseRuler, "you"),
    rulerSignStyle: signStyleSlot(rulerPosition.sign),
    rulerHouseLifeArea: rulerHouse ? houseLifeAreas[rulerHouse] ?? "" : ""
  };
}

function aspectTonePhrase(aspect: string) {
  return fallbackV3AspectFeel(aspect);
}

function transitPlanetWeatherPhrase(planet: string) {
  return planetTopicSlot(planet, "sky");
}

function personalActivationPhrase(natalPoint: string, natalPointTopic: string) {
  return `${natalPoint}: ${natalPointTopic}`;
}

function transitTimingIntensity(transit: TransitItem) {
  const orb = transitOrbValue(transit);

  if (orb <= 1) return "loud today";
  if (transit.term === "long" || transit.isSlowGeneralWeather) return "background pattern";
  if (orb <= 3) return "noticeable now";
  return "subtle signal";
}

function transitTimingPhase(direction?: TransitDirection) {
  if (direction === "applying") return "building";
  if (direction === "separating") return "processing";
  return "active";
}

function transitToNatalTemplateSlots(transit: TransitItem, natalVariant: PlanetTopicVariant = "natal"): TemplateSlotValues {
  const natalPointTopic = planetTopicSlot(transit.natalPoint, natalVariant);

  return {
    transitPlanet: transit.transitPlanet,
    transitPlanetTopic: planetTopicSlot(transit.transitPlanet, "sky"),
    aspect: titleCase(transit.aspect).toLowerCase(),
    aspectAdj: transitAspectTechnicalVerb(transit.aspect),
    aspectTone: aspectTonePhrase(transit.aspect),
    natalPoint: transit.natalPoint,
    natalPointTopic,
    transitPlanetWeather: transitPlanetWeatherPhrase(transit.transitPlanet),
    personalActivation: personalActivationPhrase(transit.natalPoint, natalPointTopic),
    house: transit.natalHouse ? ordinalHouse(transit.natalHouse) : "",
    houseLifeArea: transit.natalHouse ? houseLifeAreas[transit.natalHouse] ?? "" : "",
    activatedHouse: transit.natalHouse ? ordinalHouse(transit.natalHouse) : "",
    activatedHouseTopic: transit.natalHouse ? houseLifeAreas[transit.natalHouse] ?? "" : "",
    timingIntensity: transitTimingIntensity(transit),
    timingPhase: transitTimingPhase(transit.direction)
  };
}

function transitToNatalTemplateFallbackKey(transit: Pick<TransitItem, "natalPoint" | "natalHouse">) {
  if (isChartAnglePoint(transit.natalPoint)) {
    return templateFallbackContentKeys.youTransitToAngle;
  }

  if (transit.natalHouse) {
    return templateFallbackContentKeys.youTransitThroughHouse;
  }

  return templateFallbackContentKeys.youTransitToNatal;
}

function synastryTemplateSlots(
  personA: string,
  planetA: string,
  aspect: string,
  personB: string,
  planetB: string,
  variant: PlanetTopicVariant = "friend",
  options: {
    personAIsReader?: boolean;
    personBIsReader?: boolean;
    personAPronouns?: PronounChoice | null;
    personBPronouns?: PronounChoice | null;
  } = {}
): TemplateSlotValues {
  const planetATopic = relationshipPlanetTopicSlot(planetA, variant);
  const planetBTopic = relationshipPlanetTopicSlot(planetB, variant);
  const personAReference = resolvePersonReference({
    name: personA,
    pronouns: options.personAPronouns,
    isReader: options.personAIsReader
  });
  const personBReference = resolvePersonReference({
    name: personB,
    pronouns: options.personBPronouns,
    isReader: options.personBIsReader
  });
  const resolvedPersonA = personAReference.name;
  const resolvedPersonB = personBReference.name;
  const personAPossessive = personAReference.namePossessive;
  const personBPossessive = personBReference.namePossessive;

  return {
    personA: resolvedPersonA,
    personAPossessive,
    planetA,
    planetATopic,
    aspect: titleCase(aspect).toLowerCase(),
    aspectAdj: transitAspectTechnicalVerb(aspect),
    aspectFeel: aspectTonePhrase(aspect),
    aspectTone: aspectTonePhrase(aspect),
    personB: resolvedPersonB,
    personBPossessive,
    planetB,
    planetBTopic,
    friendName: resolvedPersonA,
    friendNamePossessive: personAPossessive,
    friendPlanet: planetA,
    friendPlanetTopic: planetATopic,
    readerName: resolvedPersonB,
    readerPossessive: personBPossessive,
    yourPlanet: planetB,
    yourPlanetTopic: planetBTopic,
    ...genericPersonReferenceSlots(personBReference),
    ...personReferenceSlots("personA", personAReference),
    ...personReferenceSlots("personB", personBReference)
  };
}

function houseOverlayTemplateSlots(
  personA: string,
  planet: string,
  personB: string,
  house: number,
  variant: PlanetTopicVariant = "friend"
): TemplateSlotValues {
  return {
    personA,
    planet,
    planetTopic: relationshipPlanetTopicSlot(planet, variant),
    personB,
    house: ordinalHouse(house),
    houseLifeArea: houseLifeAreas[house] ?? readableHouseTopic(house)
  };
}

function compositePlacementTemplateSlots(position: { planet: string; sign: string; house?: number | null }): TemplateSlotValues {
  return {
    planet: position.planet,
    planetTopic: relationshipPlanetTopicSlot(position.planet, "friend"),
    sign: position.sign,
    signStyle: signStyleSlot(position.sign),
    house: position.house ? ordinalHouse(position.house) : "",
    houseLifeArea: position.house ? houseLifeAreas[position.house] ?? readableHouseTopic(position.house) : "the shared life of the relationship"
  };
}

function relationshipTimingTemplateSlots(person: string, transit: TransitItem): TemplateSlotValues {
  return {
    person,
    transitPlanet: transit.transitPlanet,
    transitPlanetTopic: planetTopicSlot(transit.transitPlanet, "sky"),
    aspect: titleCase(transit.aspect).toLowerCase(),
    natalPoint: transit.natalPoint,
    natalPointTopic: planetTopicSlot(transit.natalPoint, "friend")
  };
}

function circleFeedTemplateSlots(topic: string): TemplateSlotValues {
  return { topic };
}

function circleFeedPreviewChart(chart: Pick<ManualChart, "id" | "displayName">) {
  return {
    id: chart.id,
    initials: profileInitials(chart.displayName, chart.displayName)
  };
}

function isChartAnglePoint(point: string) {
  return ["Ascendant", "Descendant", "Midheaven", "Imum Coeli"].includes(point);
}

function transitAspectTechnicalVerb(aspect: string) {
  const normalized = normalizeAspectType(aspect);
  const verbs: Record<string, string> = {
    conjunction: "conjunct",
    opposition: "opposite",
    square: "square",
    trine: "trine",
    sextile: "sextile"
  };

  return verbs[normalized] ?? titleCase(aspect).toLowerCase();
}

function liveGeneratedSummaryIfPresent(generated: LiveGeneratedContent | null) {
  const summary = firstReaderFacingCopy([
    generated?.summary,
    ...generatedContentParagraphs(generated)
  ]);

  return summary ? stripTldrPrefix(summary) : "";
}

function generatedSettingEnabled(
  generatedContent: GeneratedContentMap,
  contentKey: string,
  defaultValue = true
) {
  const setting = generatedContent.get(contentKey);
  const sections = setting?.sections;
  const enabled = sections && typeof sections === "object" && !Array.isArray(sections)
    ? (sections as Record<string, unknown>).enabled
    : undefined;

  if (typeof enabled === "boolean") {
    return enabled;
  }

  if (typeof setting?.body === "string") {
    const normalizedBody = setting.body.trim().toLowerCase();

    if (["off", "false", "disabled", "0"].includes(normalizedBody)) {
      return false;
    }

    if (["on", "true", "enabled", "1"].includes(normalizedBody)) {
      return true;
    }
  }

  return defaultValue;
}

function skyHistoricalLookbackEnabled(generatedContent: GeneratedContentMap) {
  return generatedSettingEnabled(generatedContent, skyHistoricalLookbackSettingKey, false);
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

function timingField(record: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!record) {
    return "";
  }

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

function timingNumberField(record: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }

  return null;
}

function timingOrbLabel(record: Record<string, unknown> | null | undefined) {
  const numericOrb = timingNumberField(record, ["orbDegrees", "orbDegree", "orb"]);

  if (numericOrb !== null) {
    const degrees = Math.floor(Math.abs(numericOrb));
    const totalMinutes = Math.round((Math.abs(numericOrb) - degrees) * 60);
    const adjustedDegrees = totalMinutes === 60 ? degrees + 1 : degrees;
    const minutes = totalMinutes === 60 ? 0 : totalMinutes;

    return minutes > 0 ? `${adjustedDegrees}°${String(minutes).padStart(2, "0")}'` : `${adjustedDegrees}°`;
  }

  const textOrb = timingField(record, ["orb"]);
  return textOrb || "within range";
}

function timingWindowLabel(record: Record<string, unknown> | null | undefined) {
  const window = timingField(record, ["window", "windowLabel", "rangeLabel", "durationLabel"]);

  if (window && !/^[a-z]+(?:-[a-z]+)+$/.test(window)) {
    return window;
  }

  return "today";
}

function dailyTimingTemplateSlots(personalTiming: PersonalTimingResponse): TemplateSlotValues {
  const boostedHit = personalTiming.timingBoostedTransits[0]?.hit ?? null;
  const topTransit = personalTiming.topTransits[0] ?? null;
  const activeTransit = boostedHit || topTransit;
  const transitPlanet = timingField(activeTransit, ["transitPlanet", "planet", "body", "from"]) || "the current sky";
  const aspect = timingField(activeTransit, ["aspect", "aspectType", "type"]) || "activating";
  const natalPoint = timingField(activeTransit, ["natalPoint", "point", "to", "body2"]) || personalTiming.activatedNatalPlanets[0] || "your chart";
  const natalPointTopic = planetTopicPhrase(natalPoint, "you");
  const orb = timingOrbLabel(activeTransit);
  const window = timingWindowLabel(activeTransit);
  const direction = timingField(activeTransit, ["direction"]) as TransitDirection | "";
  const term = timingField(activeTransit, ["term"]);
  const orbValue = timingNumberField(activeTransit, ["orbDegrees", "orbDegree", "orb"]);
  const activatedHouseTopic = personalTiming.activatedHouse ? houseLifeAreas[personalTiming.activatedHouse] ?? "" : "";
  const timingIntensity = typeof orbValue === "number" && orbValue <= 1
    ? "loud today"
    : term === "long"
      ? "background pattern"
      : typeof orbValue === "number" && orbValue <= 3
        ? "noticeable now"
        : "active signal";

  return {
    transitPlanet,
    transitPlanetTopic: planetTopicPhrase(transitPlanet, "sky"),
    transitPlanetWeather: transitPlanetWeatherPhrase(transitPlanet),
    aspect,
    aspectTone: aspectTonePhrase(aspect),
    natalPoint,
    natalPointTopic,
    personalActivation: personalActivationPhrase(natalPoint, natalPointTopic),
    orb,
    window,
    timingIntensity,
    timingPhase: transitTimingPhase(direction || undefined),
    activeTransit: `${transitPlanet} ${aspect} ${natalPoint}`.trim(),
    activatedHouse: personalTiming.activatedHouse ? ordinalHouse(personalTiming.activatedHouse) : "",
    activatedHouseTopic,
    activatedSign: personalTiming.activatedSign,
    activatedRuler: personalTiming.activatedRuler
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
  void characterLimit;
  return text.replace(/\s+/g, " ").trim();
}

function stripTldrPrefix(value: string) {
  return value
    .replace(/^(?:\*\*)?(?:TLDR|TDLR)(?:\*\*)?\s*:\s*/i, "")
    .trim();
}

function cleanGeneratedSectionHeading(heading: string) {
  const cleaned = heading.replace(/^\d{1,2}\s*[.\-·:]\s*/u, "").trim();

  return isLegacySkyArticleScaffoldHeading(cleaned) ? "" : cleaned;
}

function cleanGeneratedSectionBody(body: string) {
  return stripLegacySkyArticleScaffoldPrefix(stripTldrPrefix(body));
}

function inferredSectionQaSourceTag(section: { body?: ReactNode; sourceTag?: string }) {
  const sourceTag = typeof section.sourceTag === "string" ? section.sourceTag.trim() : "";

  if (sourceTag) {
    return sourceTag;
  }

  if (typeof section.body !== "string") {
    return "";
  }

  const trimmedBody = section.body.trim();

  if (/^\[(?:AUTHORED|FALLBACK)\s*·/u.test(trimmedBody)) {
    return "";
  }

  return "";
}

function normalizedArticleCopy(value: ReactNode) {
  return typeof value === "string"
    ? stripTldrPrefix(value).replace(/\s+/g, " ").trim().toLowerCase()
    : "";
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

function normalizeDailyTimingSurface(generated: LiveGeneratedContent | null, summary: string | null): NormalizedSurfaceArticle<"daily-timing", "writeup"> {
  const summaryCopy = summary ? normalizeGeneratedDailyCopy(summary) : "";
  const keepParagraph = (paragraph: string) => {
    const copy = normalizeGeneratedDailyCopy(paragraph);

    return copy.length > 0 && copy !== summaryCopy && !(summaryCopy && copy.startsWith(summaryCopy));
  };
  const contentKey = generated?.contentKey ?? "daily-timing";
  const generatedSections = generatedContentSections(generated)
    .map((section) => ({
      heading: cleanGeneratedSectionHeading(section.heading),
      body: splitGeneratedDailyBody(section.body).filter(keepParagraph)
    }))
    .filter((section) => section.body.length > 0);

  if (generatedSections.length > 0) {
    return {
      surface: "daily-timing",
      status: "servable",
      sections: generatedSections.map((section) => ({
        slot: "writeup",
        required: false,
        layer: "authored",
        tier: "source-grounded-daily-timing",
        sourceKeys: [contentKey],
        body: section.body.join("\n\n")
      }))
    };
  }

  const paragraphs = generatedContentParagraphs(generated)
    .map((paragraph) => stripTldrPrefix(paragraph))
    .filter(keepParagraph);

  return {
    surface: "daily-timing",
    status: paragraphs.length > 0 ? "servable" : "not-servable",
    sections: paragraphs.length > 0
      ? [{
          slot: "writeup",
          required: false,
          layer: "authored",
          tier: "source-grounded-daily-timing",
          sourceKeys: [contentKey],
          body: paragraphs.join("\n\n")
        }]
      : []
  };
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
    journalPromptsEnabled: boolean;
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
const journalPromptsStorageKey = "tldrastro:journalPrompts";
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

const traditionalSignRulers: Record<string, string> = Object.fromEntries(
  zodiacSigns.map((sign) => [sign, fallbackV3SignRuler(sign)])
);
const houseLifeAreas: Record<number, string> = {
  1: fallbackV3HouseTopic(1),
  2: fallbackV3HouseTopic(2),
  3: fallbackV3HouseTopic(3),
  4: fallbackV3HouseTopic(4),
  5: fallbackV3HouseTopic(5),
  6: fallbackV3HouseTopic(6),
  7: fallbackV3HouseTopic(7),
  8: fallbackV3HouseTopic(8),
  9: fallbackV3HouseTopic(9),
  10: fallbackV3HouseTopic(10),
  11: fallbackV3HouseTopic(11),
  12: fallbackV3HouseTopic(12)
};
const rulerHouseRouteKeywords: Record<number, string> = {
  1: fallbackV3HouseTopic(1),
  2: fallbackV3HouseTopic(2),
  3: fallbackV3HouseTopic(3),
  4: fallbackV3HouseTopic(4),
  5: fallbackV3HouseTopic(5),
  6: fallbackV3HouseTopic(6),
  7: fallbackV3HouseTopic(7),
  8: fallbackV3HouseTopic(8),
  9: fallbackV3HouseTopic(9),
  10: fallbackV3HouseTopic(10),
  11: fallbackV3HouseTopic(11),
  12: fallbackV3HouseTopic(12)
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

function parseFriendProfileTab(value: string | null): FriendProfileTab {
  return value === "compatibility" || value === "transits" || value === "synastry" || value === "composite" || value === "natal" ? value : "compatibility";
}

function friendsHashParts(hash: string) {
  const cleanHash = hash.replace(/^#\/?/, "");
  const [path = "", query = ""] = cleanHash.split("?");

  return { path, params: new URLSearchParams(query) };
}

function friendsRouteStateFromUrl() {
  try {
    const url = new URL(window.location.href);
    const { path, params } = friendsHashParts(url.hash);
    const routeParams = url.pathname === "/friends" ? url.searchParams : path === "friends" ? params : null;

    if (!routeParams) {
      return null;
    }

    const chartId = routeParams.get("chart");

    return {
      tab: parseFriendsTab(routeParams.get("tab")),
      chartId,
      view: parseFriendProfileTab(routeParams.get("view")),
      detail: routeParams.get("detail")
    };
  } catch {
    return null;
  }
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

function skyRoutePartMatches(value: string, routePart: string) {
  const normalizedValue = normalizeContentIdPart(value);

  return normalizedValue === routePart
    || (routePart === "north-node" && normalizedValue === "true-node")
    || (routePart === "true-node" && normalizedValue === "north-node");
}

function decodeSkyRouteParts(routePath: string) {
  return routePath.split("/").map((part) => decodeURIComponent(part));
}

function skyPlacementRoutePath(position: Pick<PlanetPosition, "planet"> & Partial<Pick<PlanetPosition, "sign">>) {
  const parts = ["sky", "placement", normalizeContentIdPart(position.planet)];

  if (position.sign) {
    parts.push(normalizeContentIdPart(position.sign));
  }

  return parts.map(encodeURIComponent).join("/");
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
      url.searchParams.delete("chart");
      url.searchParams.delete("view");
      url.searchParams.delete("detail");
    } else {
      const { path, params } = friendsHashParts(url.hash);
      const nextParams = path === "friends" ? params : new URLSearchParams();
      nextParams.set("tab", tab);
      nextParams.delete("chart");
      nextParams.delete("view");
      nextParams.delete("detail");
      url.hash = `friends?${nextParams.toString()}`;
    }

    window.history[mode === "replace" ? "replaceState" : "pushState"]({}, "", url.toString());
  } catch {
    // URL state is an enhancement; keep the tab usable if history is unavailable.
  }
}

function updateFriendProfileUrl(chartId: string, view: FriendProfileTab = "natal", mode: "push" | "replace" = "push", detail?: string | null) {
  try {
    const url = new URL(window.location.href);

    if (url.pathname === "/friends") {
      url.searchParams.set("tab", "charts");
      url.searchParams.set("chart", chartId);
      url.searchParams.set("view", view);
      if (detail) {
        url.searchParams.set("detail", detail);
      } else {
        url.searchParams.delete("detail");
      }
    } else {
      const nextParams = new URLSearchParams();
      nextParams.set("tab", "charts");
      nextParams.set("chart", chartId);
      nextParams.set("view", view);
      if (detail) {
        nextParams.set("detail", detail);
      }
      url.hash = `friends?${nextParams.toString()}`;
    }

    window.history[mode === "replace" ? "replaceState" : "pushState"]({}, "", url.toString());
  } catch {
    // URL state is an enhancement; keep the friend profile usable if history is unavailable.
  }
}

function friendDetailRoutePath(chartId: string, view: FriendProfileTab, detail: string) {
  const params = new URLSearchParams();
  params.set("tab", "charts");
  params.set("chart", chartId);
  params.set("view", view);
  params.set("detail", detail);

  return `friends?${params.toString()}`;
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
  pronouns: defaultPronounChoice,
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

const defaultChartSettings: ChartSettings = {
  houseSystem: "Whole Sign",
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
    houseSystem: "Whole Sign",
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
  const birthTime = validChartBirthTime(chart);
  const birthLocation = chart?.birthLocation?.timeZone
    ? chart.birthLocation
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

  const birthLocation = chart.birthLocation.timeZone ? chart.birthLocation : null;
  const timeKnown = !chart.birthTimeUnknown && Boolean(chart.birthTime);

  if (!birthLocation) {
    return null;
  }

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
  journalPromptsEnabled,
  selectedLocation
}: {
  profile: UserProfile;
  theme: UiTheme;
  sunriseOrbEnabled: boolean;
  dyslexiaFriendlyFont: boolean;
  journalPromptsEnabled: boolean;
  selectedLocation: LocationInput | null;
}): ProfilePersistencePayload {
  return {
    version: 1,
    profile,
    preferences: {
      theme,
      sunriseOrbEnabled,
      dyslexiaFriendlyFont,
      journalPromptsEnabled,
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

function skyFactValidation(snapshot: SkySnapshot) {
  return validateAstrologyFacts(snapshot.facts ?? []);
}

function logSkyFactDiagnostic(stage: string, snapshot: SkySnapshot | null, diagnostics: string[]) {
  console.warn("[astrology-fact-validation]", {
    stage,
    generatedAt: snapshot?.generatedAt ?? null,
    location: snapshot?.location ?? null,
    diagnostics
  });
}

function readCachedSkySnapshot(cacheKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const saved = window.sessionStorage.getItem(cacheKey);
    const parsed = saved ? JSON.parse(saved) : null;

    if (!isCachedSkySnapshot(parsed)) {
      return null;
    }

    const validation = skyFactValidation(parsed);

    if (!validation.ok) {
      logSkyFactDiagnostic("cache-read", parsed, validation.diagnostics);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function readMostRecentCachedSkySnapshot() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const snapshots = Object.keys(window.sessionStorage)
      .filter((key) => key.startsWith(`${skySnapshotSessionStoragePrefix}:`))
      .map((key) => readCachedSkySnapshot(key))
      .filter((snapshot): snapshot is SkySnapshot => Boolean(snapshot))
      .sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt));

    return snapshots[0] ?? null;
  } catch {
    return null;
  }
}

function writeCachedSkySnapshot(cacheKey: string, snapshot: SkySnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  const validation = skyFactValidation(snapshot);

  if (!validation.ok) {
    logSkyFactDiagnostic("cache-write", snapshot, validation.diagnostics);
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

function chartTableHouse(label: string, house?: number | null) {
  if (label === "Ascendant") {
    return 1;
  }

  return typeof house === "number" && house >= 1 && house <= 12 ? house : null;
}

function formatChartTableDegree(degree?: number | null) {
  if (typeof degree !== "number" || !Number.isFinite(degree)) {
    return "";
  }

  const normalized = ((degree % 30) + 30) % 30;
  const wholeDegrees = Math.floor(normalized);
  const minutes = Math.round((normalized - wholeDegrees) * 60);

  if (minutes >= 60) {
    return `${wholeDegrees + 1}°00'`;
  }

  return `${wholeDegrees}°${String(minutes).padStart(2, "0")}'`;
}

function natalChartTableSortValue(row: NatalChartDataTableRow) {
  const house = row.house ?? 99;
  const pointOrder: readonly string[] = placementPlanetOrder;
  const pointIndex = pointOrder.indexOf(row.label);

  return {
    house,
    pointIndex: pointIndex >= 0 ? pointIndex : 99,
    label: row.label
  };
}

function sortNatalChartTableRows(rows: NatalChartDataTableRow[]) {
  return rows.slice().sort((first, second) => {
    const firstSort = natalChartTableSortValue(first);
    const secondSort = natalChartTableSortValue(second);

    if (firstSort.house !== secondSort.house) {
      return firstSort.house - secondSort.house;
    }

    if (firstSort.pointIndex !== secondSort.pointIndex) {
      return firstSort.pointIndex - secondSort.pointIndex;
    }

    return firstSort.label.localeCompare(secondSort.label);
  });
}

function natalChartTableRowFromPosition(position: PlanetPosition): NatalChartDataTableRow {
  return {
    id: `natal-table-${position.planet}`,
    degree: formatPlanetDegree(position),
    glyph: position.glyph,
    house: chartTableHouse(position.planet, position.house),
    label: position.planet,
    retrograde: position.motion === "retrograde",
    sign: position.sign
  };
}

function natalChartTableRowFromSocial(row: SocialPlacementRow): NatalChartDataTableRow {
  return {
    id: `friend-natal-table-${row.id}`,
    degree: formatChartTableDegree(row.degree),
    glyph: row.glyph,
    house: chartTableHouse(row.label, row.house),
    label: row.label,
    retrograde: row.retrograde,
    sign: row.sign
  };
}

function natalChartTableEmptyHouseRows(sky: SkySnapshot, rows: NatalChartDataTableRow[]): NatalChartDataTableRow[] {
  const occupiedHouses = new Set(
    rows
      .map((row) => row.house)
      .filter((house): house is number => typeof house === "number" && house >= 1 && house <= 12)
  );

  return Array.from({ length: 12 }, (_, index) => index + 1)
    .filter((house) => !occupiedHouses.has(house))
    .map((house) => ({
      id: `natal-table-empty-house-${house}`,
      degree: "",
      glyph: "",
      house,
      label: "Empty house",
      sign: signAtWholeSignHouse(sky.ascendant, house) || "—"
    }));
}

function completeNatalChartTableRows(sky: SkySnapshot, rows: NatalChartDataTableRow[]) {
  return sortNatalChartTableRows([
    ...rows,
    ...natalChartTableEmptyHouseRows(sky, rows)
  ]);
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

function getInitialJournalPrompts() {
  try {
    const savedValue = window.localStorage.getItem(journalPromptsStorageKey);

    if (savedValue === "false" || savedValue === "off") {
      return false;
    }

    return true;
  } catch {
    return true;
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
    pronouns: normalizePronounChoice(chart.pronouns),
    relationshipType: normalizeRelationshipContextKey(chart.relationshipType),
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

async function resolvedManualChartBirthLocationForRepair(chart: ManualChart) {
  if (isTldrAstroApiConfigured) {
    try {
      const response = await resolveTimezone({
        latitude: chart.birthLocation.latitude,
        longitude: chart.birthLocation.longitude,
        date: chart.birthDate,
        time: chart.birthTime ?? "12:00"
      });

      if (response.source !== "fallback" && response.timeZone) {
        return {
          ...chart.birthLocation,
          timeZone: response.timeZone
        };
      }
    } catch {
      // If the API cannot resolve coordinates, do not guess a birth-chart timezone locally.
    }
  }

  return chart.birthLocation.timeZone ? chart.birthLocation : null;
}

function manualChartNeedsNatalRepair(chart: ManualChart) {
  if (chart.birthTimeUnknown || !chart.birthTime || !chart.birthDate || !chart.birthLocation) {
    return false;
  }

  return isTldrAstroApiConfigured || !chart.natalChart || !chart.birthLocation.timeZone;
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
    house: row.house ?? 0,
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
  if (/\b(?:rx|retrograde)\b/i.test(title)) {
    return "Retrograde";
  }

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

function stripArticleTitlePrefix(value: string, title: string) {
  const cleaned = stripTldrPrefix(value)
    .replace(/\s+/g, " ")
    .trim();
  const normalizedTitle = title.replace(/\s+/g, " ").trim();

  if (!cleaned || !normalizedTitle) {
    return cleaned;
  }

  return cleaned
    .replace(new RegExp(`^${escapeRegExpLiteral(normalizedTitle)}\\s*[:\\-–—]?\\s*`, "i"), "")
    .trim();
}

function articleTldrText(value: string, title = "") {
  return stripArticleTitlePrefix(value, title);
}

function isArticleTldrBodyDuplicate(tldr: string, bodyCopies: Set<string>) {
  const normalizedTldr = comparableText(tldr).replace(/\b\.\.\.$/u, "").trim();

  if (!normalizedTldr) {
    return true;
  }

  return Array.from(bodyCopies).some((body) => (
    body === normalizedTldr
    || body.startsWith(normalizedTldr)
    || normalizedTldr.startsWith(body)
  ));
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

function dateOnly(value: string | Date) {
  const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : value;

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
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

function transitHouseRangeLabel(transit: TransitItem, currentSky: SkySnapshot | null, generatedAt: string) {
  const currentPosition = currentSky?.positions.find((position) => position.planet === transit.transitPlanet);

  if (!currentPosition) {
    return "";
  }

  if (currentPosition.planet === "Pluto" && currentPosition.motion === "retrograde") {
    return retrogradeRangeText(currentPosition) ?? "";
  }

  return placementTransitRangeLabel(currentPosition, generatedAt);
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

const aspectGiftTypes = new Set(["sextile", "trine"]);
const aspectTypePattern = /\b(conjunction|conjunct|sextile|square|trine|opposition|opposite|quincunx|inconjunct)\b/i;

function normalizedAspectToneBucket(aspectType?: string): AspectToneBucket {
  const normalized = normalizeAspectType(aspectType ?? "");

  return aspectGiftTypes.has(normalized) ? "gifts" : "lessons";
}

function aspectTypeFromText(value: string) {
  const match = value.match(aspectTypePattern)?.[1] ?? "";
  return normalizeAspectType(match);
}

function aspectGlyphTypeFromText(value: string) {
  const normalized = aspectTypeFromText(value);

  if (normalized === "conjunct") {
    return "conjunction";
  }

  if (normalized === "opposite") {
    return "opposition";
  }

  return normalized;
}

function aspectGlyphPartsFromHeading(heading: string) {
  const match = heading.match(/^\s*(.+?)\s+(conjunction|conjunct|sextile|square|trine|opposition|opposite|quincunx|inconjunct)\s+(.+?)\s*$/iu);

  if (!match) {
    return null;
  }

  return {
    from: match[1].trim(),
    aspect: aspectGlyphTypeFromText(match[2]),
    to: match[3].trim()
  };
}

function normalizeRelatedAspectRow(row: ReactNode | SkyDetailRelatedAspectRow, index: number): SkyDetailRelatedAspectRow {
  if (
    row
    && typeof row === "object"
    && "node" in row
    && !isValidElement(row)
  ) {
    const relatedRow = row as SkyDetailRelatedAspectRow;
    return {
      ...relatedRow,
      key: relatedRow.key || `related-aspect-${index}`,
      group: relatedRow.group ?? normalizedAspectToneBucket(relatedRow.aspectType)
    };
  }

  return {
    key: `related-aspect-${index}`,
    aspectType: "",
    group: "lessons",
    node: row
  };
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
  const articleBody = detail.body.filter((node) => (
    !isRetrogradeTimelineNode(node) && (typeof node !== "string" || isReaderFacingCopy(node))
  ));
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
  })).filter((section) => typeof section.body !== "string" || isReaderFacingCopy(section.body));
  const contentSections = generatedSections.filter((section) => section.role !== "aspect");
  const aspectSections = generatedSections
    .filter((section) => section.role === "aspect")
    .map((section, index) => ({
      ...section,
      key: `${section.heading || "aspect"}-${index}`,
      aspectType: section.aspectType || aspectTypeFromText(`${section.heading} ${typeof section.body === "string" ? section.body : ""}`),
      group: section.group ?? normalizedAspectToneBucket(section.aspectType || aspectTypeFromText(section.heading))
    }));
  const drilldown = detail.astrologyDrilldown;
  const authoredTldr = detail.tldr ? stripArticleTitlePrefix(detail.tldr, detail.title) : "";
  const articleBodyComparableCopies = new Set(
    [
      ...paragraphs.filter((paragraph): paragraph is string => typeof paragraph === "string"),
      ...generatedSections.flatMap((section) => (
        typeof section.body === "string"
          ? section.body.split(/\n{2,}/)
          : []
      ))
    ]
      .map((paragraph) => comparableText(stripTldrPrefix(stripLegacySkyArticleScaffoldPrefix(paragraph))))
      .filter(Boolean)
  );
  // TLDR is an explicit authored slot; subtitle and body are never substitutes.
  const articleSubCandidate = detail.suppressTldr ? "" : articleTldrText(authoredTldr, detail.title);
  const articleSub = isReaderFacingCopy(articleSubCandidate) && !isArticleTldrBodyDuplicate(articleSubCandidate, articleBodyComparableCopies)
    ? articleSubCandidate
    : "";
  const articleSubComparable = comparableText(articleSub);
  const displaySections = contentSections.filter((section, index) => {
    if (index !== 0 || !articleSubComparable || typeof section.body !== "string") {
      return true;
    }

    return comparableText(stripLegacySkyArticleScaffoldPrefix(section.body)) !== articleSubComparable;
  });
  const fallbackParagraphs = paragraphs.filter((paragraph) => (
    typeof paragraph !== "string" || comparableText(stripTldrPrefix(paragraph)) !== articleSubComparable
  ));
  const [bodyLede, ...bodySectionParagraphs] = fallbackParagraphs;
  const eyebrowLabel = articleEyebrowLabel(detail.title, detail.kicker);
  const eyebrowGlyphs = articleEyebrowGlyphs({
    glyph: detail.glyph,
    meta: metaRows.map((row) => row.value).join(" "),
    title: detail.title
  });
  const relatedAspectRows = (detail.relatedAspects?.rows ?? []).map(normalizeRelatedAspectRow);
  const aspectGroups = ([
    { id: "gifts" as const, label: "Gifts" },
    { id: "lessons" as const, label: "Lessons" }
  ]).map((group) => ({
    ...group,
    sections: aspectSections.filter((section) => section.group === group.id),
    rows: relatedAspectRows.filter((row) => row.group === group.id)
  })).filter((group) => group.sections.length > 0 || group.rows.length > 0);
  const hasAspectCard = aspectGroups.length > 0;
  const hasReadableBody = Boolean(
    detail.lensHint ||
      (detail.plainBody && fallbackParagraphs.length > 0) ||
      displaySections.length > 0 ||
      fallbackParagraphs.length > 0 ||
      drilldown
  );
  const isAspectsOnlyArticle = hasAspectCard && !hasReadableBody;

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

          {hasReadableBody ? <hr className="article-rule" /> : null}

          {hasReadableBody ? (
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
              ) : displaySections.length > 0 ? (
                <>
                  {detail.bodyBeforeSections && fallbackParagraphs.length > 0 ? (
                    <section className="article-section sky-detail-section sky-detail-intro-section">
                      {fallbackParagraphs.map((paragraph, paragraphIndex) => (
                        <p key={`intro-${paragraphIndex}`}>{paragraph}</p>
                      ))}
                    </section>
                  ) : null}
                  {displaySections.map((section, index) => {
                    const bodyParagraphs = typeof section.body === "string"
                      ? section.body.split(/\n{2,}/).map((paragraph) => stripLegacySkyArticleScaffoldPrefix(paragraph)).filter(Boolean)
                      : [];
                    const sectionHeading = typeof section.heading === "string" && (index > 0 || comparableText(section.heading) !== comparableText(detail.title))
                      ? section.heading
                      : "";
                    const sourceTag = inferredSectionQaSourceTag(section);
                    const bodyAlreadyStartsWithTag = sourceTag && bodyParagraphs[0]?.trim() === sourceTag;

                    return (
                      <section className="article-section sky-detail-section" key={`${section.heading || "section"}-${index}`}>
                        {sectionHeading ? <h2>{sectionHeading}</h2> : null}
                        {sourceTag && !bodyAlreadyStartsWithTag ? <p>{sourceTag}</p> : null}
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
                  {bodySectionParagraphs.length > 0 ? (
                    <section className="article-section sky-detail-section">
                      {bodySectionParagraphs.map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </section>
                  ) : null}
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
              {detail.historicalLookback ? (
                <section className="article-section sky-detail-section sky-detail-historical-lookback" aria-label="Historical context">
                  <h2>{detail.historicalLookback.heading}</h2>
                  <p className="sky-detail-historical-lookback__date">{detail.historicalLookback.dateLabel}</p>
                  {detail.historicalLookback.paragraphs.map((paragraph, index) => (
                    <p key={`historical-${index}`}>{paragraph}</p>
                  ))}
                </section>
              ) : null}
              <div className="sky-detail-end" aria-hidden="true">✦</div>
            </div>
          </div>
          ) : null}
        </div>

        {hasAspectCard ? aspectGroups.map((group) => (
          <Fragment key={group.id}>
            <span className="eyebrow section-label article-related-aspects__label article-related-aspects__label--outside">{group.label}</span>
            <section className="article-card article-related-aspects article-related-aspects-card" aria-label={group.label}>
              <div className="article-related-aspects__group">
                {group.sections.length ? (
                  <div className="article-related-aspects__copy-list">
                    {group.sections.map((section) => {
                      const bodyParagraphs = typeof section.body === "string"
                        ? section.body.split(/\n{2,}/).map((paragraph) => stripLegacySkyArticleScaffoldPrefix(paragraph)).filter(Boolean)
                        : [];
                      const sectionHeading = typeof section.heading === "string" && comparableText(section.heading) !== comparableText(detail.title)
                        ? section.heading
                        : "";
                      const glyphParts = sectionHeading ? aspectGlyphPartsFromHeading(sectionHeading) : null;
                      const sourceTag = inferredSectionQaSourceTag(section);
                      const bodyAlreadyStartsWithTag = sourceTag && bodyParagraphs[0]?.trim() === sourceTag;

                      return (
                        <section className="article-section sky-detail-section article-related-aspects__copy" key={section.key}>
                          {sectionHeading ? (
                            <div className="article-related-aspects__copy-heading">
                              {glyphParts ? <AspectGlyphs from={glyphParts.from} aspect={glyphParts.aspect} to={glyphParts.to} /> : null}
                              <h3>{sectionHeading}</h3>
                            </div>
                          ) : null}
                          {sourceTag && !bodyAlreadyStartsWithTag ? <p>{sourceTag}</p> : null}
                          {bodyParagraphs.length > 0
                            ? bodyParagraphs.map((paragraph, paragraphIndex) => (
                              <p key={`${section.key}-${paragraphIndex}`}>{paragraph}</p>
                            ))
                            : <p>{typeof section.body === "string" ? stripLegacySkyArticleScaffoldPrefix(section.body) : section.body}</p>}
                        </section>
                      );
                    })}
                  </div>
                ) : null}
                {group.rows.length ? (
                  <div className="article-related-aspects__list aspect-row-list">
                    {group.rows.map((row) => (
                      <Fragment key={row.key}>{row.node}</Fragment>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
          </Fragment>
        )) : null}
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
  const normalizedAspect = normalizeFallbackV3Aspect(aspect);

  if (!normalizedAspect) {
    return "";
  }

  try {
    const rendered = transitSynastryFallbackRendererV3.renderTransitAspect({
      aspect: normalizedAspect,
      natal: normalizeContentIdPart(natalPoint),
      transiting: normalizeContentIdPart(transitPlanet)
    });

    return firstReaderFacingCopy(readerFacingParagraphs(rendered.parts));
  } catch (error) {
    if (error instanceof FallbackV3SourceGapError) {
      return "";
    }

    throw error;
  }
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

function natalAspectDisplayTitle(aspect: SkySnapshot["aspects"][number]) {
  return `${aspect.from} ${titleCase(aspect.type)} ${aspect.to}`;
}

function sourceGroundedNatalAspectNormalizedSection(
  aspect: SkySnapshot["aspects"][number],
  ownerContext?: ChartOwnerContext
): NormalizedNatalAspectSection | null {
  const normalizedAspect = normalizeFallbackV3Aspect(aspect.type);

  if (!normalizedAspect) {
    return null;
  }

  try {
    const rendered = fallbackRendererV3.renderNatalAspect({
      aspect: normalizedAspect,
      planetA: normalizeContentIdPart(aspect.from),
      planetB: normalizeContentIdPart(aspect.to),
      voice: ownerContext?.ownerName ?? "you"
    });
    const body = readerFacingParagraphs(rendered.parts).join("\n\n");

    if (!body || !isReaderFacingCopy(body)) {
      return null;
    }

    return {
      slot: "meaning",
      required: true,
      layer: "fallback",
      tier: "fallback-architecture-v3",
      sourceKeys: [
        "tldrastro-fallback-architecture-v3",
        rendered.templateKey
      ].filter(Boolean),
      heading: rendered.headline || natalAspectDisplayTitle(aspect),
      body
    };
  } catch (error) {
    if (error instanceof FallbackV3SourceGapError) {
      return null;
    }

    throw error;
  }
}

function normalizeNatalAspectSurface(
  aspect: SkySnapshot["aspects"][number],
  ownerContext?: ChartOwnerContext
): NormalizedNatalAspectArticle {
  const sourceGroundedSection = sourceGroundedNatalAspectNormalizedSection(aspect, ownerContext);
  const sections = sourceGroundedSection ? [sourceGroundedSection] : [];

  return {
    surface: "natal-aspect",
    status: sourceGroundedSection ? (sourceGroundedSection.layer === "authored" ? "servable" : "partial") : "not-servable",
    sections
  };
}

function generatedNatalAspectSection(
  aspect: SkySnapshot["aspects"][number],
  generatedContent: GeneratedContentMap
): NormalizedNatalAspectSection | null {
  void aspect;
  void generatedContent;
  return null;
}

function natalAspectDetailArticle(
  aspect: SkySnapshot["aspects"][number],
  generatedContent: GeneratedContentMap = new Map(),
  ownerContext?: ChartOwnerContext
): YouTransitArticle {
  const contentKey = aspectContentId(aspect.from, aspect.type, aspect.to);
  const title = natalAspectDisplayTitle(aspect);
  const generatedSection = generatedNatalAspectSection(aspect, generatedContent);
  const normalized = generatedSection
    ? { surface: "natal-aspect", status: "servable", sections: [generatedSection] } satisfies NormalizedNatalAspectArticle
    : normalizeNatalAspectSurface(aspect, ownerContext);
  const ownerAwareCopy = (section: NormalizedNatalAspectSection) => {
    const value = taggedSectionBody(section);

    return generatedSection && section === generatedSection && ownerContext
      ? natalGeneratedCopyForOwner(value, ownerContext.ownerName, ownerContext.ownerKind ?? "person", ownerContext.ownerPronouns)
      : value;
  };
  const resolvedBody = normalized.sections.map(ownerAwareCopy);
  const resolvedSummary = resolvedBody[0] ?? "";

  return {
    id: contentKey,
    title,
    glyph: pointGlyph(aspect.from),
    subtitle: stripTldrPrefix(resolvedSummary),
    compactHeader: true,
    bodyBeforeSections: true,
    body: resolvedBody,
    summary: "",
    summaryHeading: "",
    sections: [],
    meta: [
      { label: "Aspect", value: titleCase(aspect.type) },
      { label: "Orb", value: wholeDegreeOrb(aspect.orb) }
    ]
  };
}

function skyAspectDisplayTitle(aspect: SkySnapshot["aspects"][number]) {
  return `${aspect.from} ${titleCase(aspect.type)} ${aspect.to}`;
}

function skyAspectWritingSection(
  aspect: SkySnapshot["aspects"][number],
  positions?: PlanetPosition[],
  generatedAt?: string
): NormalizedSkyAspectSection | null {
  void positions;
  const dateLine = generatedAt ? currentSkyAspectTransitRange(aspect, generatedAt) : "";
  const body = formatSkyWritingAspectBeat({
    aspect: aspect.type,
    dateLine,
    from: aspect.from,
    to: aspect.to
  });

  return body ? {
    slot: "meaning",
    required: true,
    layer: "fallback",
    tier: "sky-writing-v1-computed",
    sourceKeys: ["sky-writing-v1", "computed-aspect-beat"],
    heading: skyAspectDisplayTitle(aspect),
    body
  } : null;
}

function normalizeSkyAspectSurface(
  aspect: SkySnapshot["aspects"][number],
  generatedContent?: GeneratedContentMap,
  positions?: PlanetPosition[],
  generatedAt?: string
): NormalizedSkyAspectArticle {
  void generatedContent;
  const fallbackSection = skyAspectWritingSection(aspect, positions, generatedAt);
  const sections = fallbackSection ? [fallbackSection] : [];

  return {
    surface: "sky-aspect",
    status: fallbackSection ? (fallbackSection.layer === "authored" ? "servable" : "partial") : "not-servable",
    sections
  };
}

function currentSkyAspectDetailArticle(
  aspect: SkySnapshot["aspects"][number],
  generatedAt: string,
  generatedContent: GeneratedContentMap,
  positions?: PlanetPosition[]
): SkyDetail {
  const title = skyAspectDisplayTitle(aspect);
  const normalized = normalizeSkyAspectSurface(aspect, generatedContent, positions, generatedAt);
  const body = normalized.sections.flatMap((section) => taggedSectionParagraphs(section));
  const timing = currentSkyAspectTransitRange(aspect, generatedAt);
  const historicalLookback = resolveSkyHistoricalLookback({
    enabled: skyHistoricalLookbackEnabled(generatedContent),
    eventIdentity: {
      eventType: "aspect-cycle",
      bodies: [aspect.from, aspect.to],
      aspect: aspect.type
    }
  });

  return {
    routePath: skyAspectRoutePath(aspect),
    glyph: `${pointGlyph(aspect.from)} ${aspectGlyph(aspect.type)} ${pointGlyph(aspect.to)}`,
    kicker: "",
    title,
    meta: `${aspectTone(aspect.type).toUpperCase()} · ${timing}`,
    duration: timing,
    subtitle: "",
    suppressTldr: true,
    body,
    sections: [],
    historicalLookback,
    astrologyDrilldown: null
  };
}

function skyAspectsForPlacement(planet: string, aspects: SkySnapshot["aspects"]) {
  return aspects
    .filter((aspect) => aspect.from === planet || aspect.to === planet)
    .slice()
    .sort((first, second) => first.orb - second.orb)
    .slice(0, 2);
}

function relatedSkyAspectSectionsForPlacement({
  aspects,
  generatedAt,
  generatedContent,
  pointName,
  positions
}: {
  aspects: SkySnapshot["aspects"];
  generatedAt: string;
  generatedContent: GeneratedContentMap;
  pointName: string;
  positions: PlanetPosition[];
}): SkyDetailSection[] {
  return aspects
    .filter((aspect) => aspect.from === pointName || aspect.to === pointName)
    .filter((aspect, index, matchingAspects) => uniqueNatalAspectRows(matchingAspects).includes(aspect))
    .slice()
    .sort((first, second) => first.orb - second.orb)
    .flatMap((aspect) => {
      const aspectDetail = currentSkyAspectDetailArticle(aspect, generatedAt, generatedContent, positions);
      const body = aspectDetail.body
        .filter((paragraph): paragraph is string => typeof paragraph === "string")
        .map((paragraph) => stripLegacySkyArticleScaffoldPrefix(stripTldrPrefix(paragraph)).trim())
        .filter((paragraph) => paragraph && isReaderFacingCopy(paragraph))
        .join("\n\n");

      if (!body) {
        return [];
      }

      return [{
        heading: aspectDetail.title,
        body,
        role: "aspect" as const,
        aspectType: aspect.type,
        group: normalizedAspectToneBucket(aspect.type)
      }];
    })
    .slice(0, 2);
}

function skyPlacementWritingBeats({
  aspects,
  generatedAt,
  planet,
  positions
}: {
  aspects: SkySnapshot["aspects"];
  generatedAt: string;
  planet: string;
  positions?: PlanetPosition[];
}): SkyWritingAspectBeat[] {
  return skyAspectsForPlacement(planet, aspects).map((aspect) => {
    void positions;

    return {
      aspect: titleCase(aspect.type),
      dateLine: currentSkyAspectTransitRange(aspect, generatedAt),
      from: aspect.from,
      to: aspect.to
    };
  });
}

function splitSurfaceParagraphs(value: string, title: string, timing?: string | null) {
  const metadata = new Set(
    [title, timing]
      .filter((item): item is string => Boolean(item?.trim()))
      .map((item) => comparableText(item))
  );

  return readerFacingParagraphs(
    value
      .split(/\n{2,}|\r?\n/)
      .map((paragraph) => stripTldrPrefix(paragraph).trim())
      .filter((paragraph) => {
        const normalized = comparableText(paragraph);

        return normalized && !metadata.has(normalized);
      })
  );
}

function skyPlacementDisplayTitle(position: PlanetPosition) {
  return `${position.planet} in ${position.sign}`;
}

function skyPlacementWritingSection(
  position: PlanetPosition,
  beats: SkyWritingAspectBeat[] = []
): NormalizedSkyPlacementSection | null {
  const article = resolveSkyWritingArticle({
    planet: position.planet,
    sign: position.sign,
    motion: position.motion,
    transitEnd: position.transitEnd,
    retrogradeStart: position.retrogradeStart,
    retrogradeEnd: position.retrogradeEnd,
    retrogradeShadowStart: position.retrogradeShadowStart,
    retrogradeShadowEnd: position.retrogradeShadowEnd,
    cazimiDate: position.cazimi ? position.retrogradeStart : null
  }, beats);

  const body = article ? readerFacingParagraphs(article.paragraphs).join("\n\n") : "";

  if (!article || !isReaderFacingCopy(body)) {
    return null;
  }

  return {
    slot: "meaning",
    required: true,
    layer: article.layer,
    tier: article.layer === "authored" ? "sky-writing-v1-authored" : "sky-writing-v1-fallback",
    sourceKeys: article.sourceKeys,
    heading: skyPlacementDisplayTitle(position),
    body
  };
}

function normalizeSkyPlacementSurface(
  position: PlanetPosition,
  duration?: string | null,
  generatedContent?: GeneratedContentMap,
  beats: SkyWritingAspectBeat[] = []
): NormalizedSkyPlacementArticle {
  void duration;
  void generatedContent;
  const fallbackSection = skyPlacementWritingSection(position, beats);
  const sections = fallbackSection ? [fallbackSection] : [];

  return {
    surface: "sky-placement",
    status: fallbackSection ? (fallbackSection.layer === "authored" ? "servable" : "partial") : "not-servable",
    sections
  };
}

function currentSkyPlacementDetailArticle({
  aspects,
  generatedAt,
  generatedContent,
  position,
  positions
}: {
  aspects: SkySnapshot["aspects"];
  generatedAt: string;
  generatedContent: GeneratedContentMap;
  onOpenDetail?: (detail: SkyDetail) => void;
  position: PlanetPosition;
  positions: PlanetPosition[];
}): SkyDetail {
  const activeAspects = skyAspectsForPlacement(position.planet, aspects);
  const title = placementDetailTitle(position, activeAspects);
  const isRetrograde = position.motion === "retrograde";
  const transitRangeLabel = isRetrograde
    ? retrogradeRangeText(position)
    : placementTransitRangeLabel(position, generatedAt);
  const placementEvents = skyPlacementWritingBeats({
    aspects,
    generatedAt,
    planet: position.planet,
    positions
  });
  const normalized = normalizeSkyPlacementSurface(position, transitRangeLabel, generatedContent, placementEvents);
  const normalizedParagraphs = normalized.sections
    .flatMap((section) => taggedSectionParagraphs(section));
  const authoredBody = normalized.sections
    .filter((section) => section.layer === "authored")
    .flatMap((section) => readerFacingParagraphs([section.body]));
  const body = isRetrograde
    ? stripRetrogradeGeneratedHeaderParagraphs(
        position,
        normalizedParagraphs
      )
    : normalizedParagraphs;
  const relatedAspectSections = relatedSkyAspectSectionsForPlacement({
    aspects,
    generatedAt,
    generatedContent,
    pointName: position.planet,
    positions
  });
  const historicalLookback = resolveSkyHistoricalLookback({
    enabled: skyHistoricalLookbackEnabled(generatedContent),
    eventIdentity: {
      eventType: isRetrograde ? "retrograde" : "planet-in-sign",
      bodies: [position.planet],
      sign: position.sign,
      direction: isRetrograde ? "retrograde" : undefined
    }
  });
  return {
    routePath: skyPlacementRoutePath(position),
    glyph: detailGlyphForPlacement(position),
    kicker: placementDetailKicker(position, activeAspects),
    title,
    meta: [formatPlacementPosition(position).toUpperCase(), transitRangeLabel].filter(Boolean).join(" · "),
    duration: transitRangeLabel ?? undefined,
    retrograde: isRetrograde,
    plainBody: normalized.sections.some((section) => section.layer === "authored"),
    suppressTldr: authoredBody.length > 0 && !isRetrograde,
    body,
    sections: relatedAspectSections,
    historicalLookback,
    astrologyDrilldown: null
  };
}

function skyDetailFromRoutePath(
  routePath: string,
  sky: SkySnapshot,
  generatedContent: GeneratedContentMap,
  onOpenDetail?: (detail: SkyDetail) => void
) {
  const [surface, detailType, firstPart, secondPart, thirdPart] = decodeSkyRouteParts(routePath);

  if (surface !== "sky") {
    return null;
  }

  if (detailType === "retrograde" && firstPart) {
    const position = activeRetrogradePositions(skyNodeDisplayPositions(sky.positions))
      .find((retrogradePosition) => skyRoutePartMatches(retrogradePosition.planet, firstPart));

    return position ? currentSkyRetrogradeDetailData(position, sky.generatedAt, generatedContent).detail : null;
  }

  if (detailType === "placement" && firstPart) {
    const displayPositions = skyNodeDisplayPositions(sky.positions);
    const position = displayPositions.find((candidate) => skyRoutePartMatches(candidate.planet, firstPart));
    const routeSign = secondPart
      ? zodiacSigns.find((candidate) => skyRoutePartMatches(candidate, secondPart))
      : null;
    const routedPosition = position && routeSign
      ? {
          ...position,
          sign: routeSign,
          signGlyph: signGlyph(routeSign)
        }
      : position;

    return routedPosition ? currentSkyPlacementDetailArticle({
      aspects: sky.aspects,
      generatedAt: sky.generatedAt,
      generatedContent,
      onOpenDetail,
      position: routedPosition,
      positions: displayPositions
    }) : null;
  }

  if (detailType === "aspect" && firstPart && secondPart && thirdPart) {
    const aspect = sky.aspects.find((candidate) => (
      skyRoutePartMatches(candidate.from, firstPart)
      && skyRoutePartMatches(candidate.type, secondPart)
      && skyRoutePartMatches(candidate.to, thirdPart)
    ));

    if (!aspect || normalizeSkyAspectSurface(aspect, generatedContent, sky.positions, sky.generatedAt).sections.length === 0) {
      return null;
    }

    return currentSkyAspectDetailArticle(aspect, sky.generatedAt, generatedContent, sky.positions);
  }

  return null;
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
  ownerContext?: ChartOwnerContext;
  pointName: string;
  positions?: PlanetPosition[];
}) {
  return aspects
    .filter((aspect) => aspect.from === pointName || aspect.to === pointName)
    .filter((aspect, index, matchingAspects) => uniqueNatalAspectRows(matchingAspects).includes(aspect))
    .slice()
    .sort((first, second) => first.orb - second.orb)
    .map((aspect) => {
      const normalizedSkySurface = mode === "sky" && generatedAt
        ? normalizeSkyAspectSurface(aspect, generatedContent, positions, generatedAt)
        : null;

      if (mode === "sky" && !normalizedSkySurface?.sections.length) {
        return null;
      }

      const otherPoint = aspectOtherPoint(aspect, pointName);
      const title = `${pointName} ${titleCase(aspect.type)} ${otherPoint}`;
      const rowSummary = normalizedSkySurface
        ? normalizedSurfacePreview(normalizedSkySurface)
        : normalizedSurfacePreview(normalizeNatalAspectSurface(aspect, ownerContext));
      const displaySummary = rowSummary;
      const key = `${mode}-${pointName}-${aspect.from}-${aspect.type}-${aspect.to}`;
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
        return {
          key,
          aspectType: aspect.type,
          group: normalizedAspectToneBucket(aspect.type),
          node: (
          <button
            aria-label={`Read more about ${title}`}
            className="article-related-aspect-row aspect-row aspect-row-button"
            onClick={() => onOpenNatalAspect(aspect)}
            type="button"
          >
            {rowContent}
          </button>
          )
        };
      }

      if (mode === "sky" && onOpenSkyAspect) {
        return {
          key,
          aspectType: aspect.type,
          group: normalizedAspectToneBucket(aspect.type),
          node: (
          <button
            aria-label={`Read more about ${title}`}
            className="article-related-aspect-row aspect-row aspect-row-button"
            onClick={() => onOpenSkyAspect(aspect)}
            type="button"
          >
            {rowContent}
          </button>
          )
        };
      }

      return {
        key,
        aspectType: aspect.type,
        group: normalizedAspectToneBucket(aspect.type),
        node: (
        <div
          className="article-related-aspect-row aspect-row aspect-row-static"
        >
          {rowContent}
        </div>
        )
      };
    })
    .filter(Boolean)
    .slice(0, mode === "sky" ? 2 : 4);
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
        transitMotion: transitPosition.motion,
        aspect: aspect.type,
        natalPoint: natalPosition.planet,
        natalSign: natalPosition.sign,
        natalHouse: natalPosition.house,
        orb: formatOrb(aspect.orbValue),
        arc: [aspect.orbValue + 1.8, aspect.orbValue + 1.1, aspect.orbValue + 0.4, aspect.orbValue, aspect.orbValue + 0.5, aspect.orbValue + 1.2],
        note: transitNote(transitPosition.planet, aspect.type, natalPosition.planet),
        isSlowGeneralWeather: slowChapterPlanets.has(transitPosition.planet) && !elevatedSlowTransit
      } satisfies TransitItem;
    })
  ))
    .sort((first, second) => transitOrbValue(first) - transitOrbValue(second));
}

const transitAxisPairs: Record<string, string> = {
  Ascendant: "Descendant",
  Descendant: "Ascendant",
  Midheaven: "Imum Coeli",
  "Imum Coeli": "Midheaven"
};

const transitAxisPriority: Record<string, number> = {
  Ascendant: 0,
  Midheaven: 1,
  Descendant: 2,
  "Imum Coeli": 3
};

function transitAxisDuplicateKey(transit: TransitItem) {
  const pairedAngle = transitAxisPairs[transit.natalPoint];

  if (!pairedAngle || !["conjunction", "opposition"].includes(transit.aspect)) {
    return null;
  }

  const axisName = ["Ascendant", "Descendant"].includes(transit.natalPoint) ? "horizon" : "meridian";
  const canonicalPoint = transit.aspect === "conjunction" ? transit.natalPoint : pairedAngle;

  return `${transit.transitPlanet}-${axisName}-${canonicalPoint}`.toLowerCase().replace(/\s+/g, "-");
}

function dedupeTransitAxisContacts<T extends TransitItem>(transits: T[]) {
  const byAxis = new Map<string, T>();
  const deduped: T[] = [];

  transits.forEach((transit) => {
    const axisKey = transitAxisDuplicateKey(transit);

    if (!axisKey) {
      deduped.push(transit);
      return;
    }

    const existing = byAxis.get(axisKey);

    if (!existing) {
      byAxis.set(axisKey, transit);
      deduped.push(transit);
      return;
    }

    const existingScore = transitAxisPriority[existing.natalPoint] ?? 99;
    const nextScore = transitAxisPriority[transit.natalPoint] ?? 99;
    const existingOrb = transitOrbValue(existing);
    const nextOrb = transitOrbValue(transit);
    const shouldReplace = nextScore < existingScore || (nextScore === existingScore && nextOrb < existingOrb);

    if (shouldReplace) {
      byAxis.set(axisKey, transit);
      const existingIndex = deduped.indexOf(existing);

      if (existingIndex >= 0) {
        deduped[existingIndex] = transit;
      }
    }
  });

  return deduped;
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

function transitItemExactDate(transit: TransitItem, generatedAt: string) {
  const speed = averageDailyMotion[transit.transitPlanet] ?? 1;
  const orb = transitOrbValue(transit);
  const direction = transit.direction?.toLowerCase();
  const exactOffsetDays = direction === "separating"
    ? -(orb / speed)
    : direction === "applying"
      ? orb / speed
      : 0;

  return dateFromOffsetDays(generatedAt, exactOffsetDays);
}

function formatActivationWindowDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function transitItemActivationTimingWindow(transit: TransitItem, generatedAt: string): NatalAspectPatternActivationTimingWindow {
  const exact = transitItemExactDate(transit, generatedAt);
  const speed = averageDailyMotion[transit.transitPlanet] ?? 1;
  const applyingOrb = transitToNatalOrbLimit(transit.transitPlanet, "applying") || transitToNatalOrbLimit(transit.transitPlanet);
  const separatingOrb = transitToNatalOrbLimit(transit.transitPlanet, "separating") || transitToNatalOrbLimit(transit.transitPlanet);
  const start = dateFromOffsetDays(exact.toISOString(), -(applyingOrb / speed));
  const end = dateFromOffsetDays(exact.toISOString(), separatingOrb / speed);
  const startLabel = formatEditorialDate(start, true);
  const exactLabel = formatEditorialDate(exact, true);
  const endLabel = formatEditorialDate(end, true);

  return {
    startLabel,
    exactLabel,
    endLabel,
    rangeLabel: `${startLabel} - ${endLabel}`,
    durationLabel: formatRemainingClockCompact(generatedAt, end) ?? "Duration",
    activeRangeLabel: `${formatActivationWindowDate(start)} - ${formatActivationWindowDate(end)} (Exact: ${formatActivationWindowDate(exact)})`
  };
}

function lowerStringSet(value: unknown) {
  return new Set(
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string").map((item) => item.toLowerCase())
      : []
  );
}

function activationTimingOverridesForTransits(
  items: NatalAspectPatternReaderItem[],
  transits: TransitItem[],
  generatedAt: string
): Record<string, NatalAspectPatternActivationTimingWindow> {
  return Object.fromEntries(items.flatMap((item) => {
    if (!item.activationCopy) {
      return [];
    }

    const movingBodies = lowerStringSet(item.activationCopy.triggerSummary.movingBodies);
    const targetedPlanets = lowerStringSet(item.activationCopy.triggerSummary.targetedNatalPlanets);
    const matchingTransit = transits
      .filter((transit) => movingBodies.has(transit.transitPlanet.toLowerCase()) && targetedPlanets.has(transit.natalPoint.toLowerCase()))
      .sort((first, second) => transitOrbValue(first) - transitOrbValue(second))[0];

    return matchingTransit
      ? [[item.patternId, transitItemActivationTimingWindow(matchingTransit, generatedAt)]]
      : [];
  }));
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
  1: "enter the world",
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
  1: "enter the world",
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

    return firstHouseSentences[sign] ?? `With ${sign || "the house sign"} on the 1st house, ${subject} meet life through the style of that sign.`;
  }

  const sentences: Record<string, string> = {
    Aries: `With Aries on the ${ordinalHouse(house)} house, ${topic} needs a direct move. ${capitalizeText(subject)} may have to start the conversation, make the first choice, or act before the whole answer is clear.`,
    Taurus: `With Taurus on the ${ordinalHouse(house)} house, ${subject} may need calm, repetition, and physical proof before ${topic} feels settled. When life gets loud or rushed, familiar routines and a slower pace can help ${context === "friend" ? "them" : "you"} know what is actually worth keeping.`,
    Gemini: `With Gemini on the ${ordinalHouse(house)} house, ${topic} becomes easier to understand once ${subject} can talk it through, question it, and let the story change as new information arrives.`,
    Cancer: `With Cancer on the ${ordinalHouse(house)} house, ${topic} is tied to comfort, care, and the need to feel protected. When the situation feels unsettled, ${subject} may hold on tighter, pull back, or look for something familiar before making a choice.`,
    Leo: `With Leo on the ${ordinalHouse(house)} house, ${topic} has to feel personal. ${capitalizeText(subject)} may need room to be seen, take pride in what ${subject} want, or choose something because it genuinely matters.`,
    Virgo: `With Virgo on the ${ordinalHouse(house)} house, ${topic} becomes clearer through the details ${subject} cannot ignore. The point is not perfection; it is learning what actually makes life work better.`,
    Libra: `With Libra on the ${ordinalHouse(house)} house, ${topic} often becomes visible through another person. ${capitalizeText(possessive)} work is noticing the difference between real balance and simply keeping things pleasant.`,
    Scorpio: `With Scorpio on the ${ordinalHouse(house)} house, ${topic} is rarely casual. This house becomes clearer when ${subject} are honest about what is trusted, withheld, wanted, or feared.`,
    Sagittarius: `With Sagittarius on the ${ordinalHouse(house)} house, ${topic} needs a wider horizon. ${capitalizeText(possessive)} understanding here grows when experience challenges the first explanation and asks for something truer.`,
    Capricorn: `With Capricorn on the ${ordinalHouse(house)} house, ${topic} develops through time and consequence. This house may not reveal itself quickly, but it becomes more solid when ${subject} respect what has to be built.`,
    Aquarius: `With Aquarius on the ${ordinalHouse(house)} house, ${subject} may not approach ${topic} the way other people expect. ${capitalizeText(subject)} may need freedom to question the usual rules, try a different route, or choose something because it makes sense to ${context === "friend" ? "them" : "you"}, not because it is popular.`,
    Pisces: `With Pisces on the ${ordinalHouse(house)} house, ${topic} may not follow a straight line. ${capitalizeText(subject)} may need time, quiet, creativity, or a more compassionate pace before the right choice becomes clear.`
  };

  if (house === 11 && sign === "Aries") {
    return context === "friend"
      ? "With Aries on the 11th house, belonging may require initiative. They may have to be the one who reaches out, starts the conversation, joins the room, or leaves the group that no longer fits. Waiting until they feel completely certain can keep them outside of the spaces they are meant to test for themselves."
      : "With Aries on the 11th house, belonging may require initiative. You may have to be the one who reaches out, starts the conversation, joins the room, or leaves the group that no longer fits. Waiting until you feel completely certain can keep you outside of the spaces you are meant to test for yourself.";
  }

  if (house === 2 && sign === "Cancer") {
    return context === "friend"
      ? "With Cancer on the 2nd house, their sense of worth is tied to care, comfort, and feeling like they have enough to rely on. Money may not feel separate from emotion here. When they feel unsettled, it can affect how they spend, save, protect, or hold on."
      : "With Cancer on the 2nd house, your sense of worth is tied to care, comfort, and feeling like you have enough to rely on. Money may not feel separate from emotion here. When you feel unsettled, it can affect how you spend, save, protect, or hold on.";
  }

  if (house === 10 && sign === "Cancer") {
    return context === "friend"
      ? "With Cancer on the 10th house, their career path may be shaped by care, familiarity, and the need to feel emotionally safe before they commit to a direction. When work feels unstable or unclear, they may hold on tighter, pull back, or look for something familiar before making a move."
      : "With Cancer on the 10th house, your career path may be shaped by care, familiarity, and the need to feel emotionally safe before you commit to a direction. When work feels unstable or unclear, you may hold on tighter, pull back, or look for something familiar before making a move.";
  }

  if (house === 10 && sign === "Pisces") {
    return context === "friend"
      ? "With Pisces on the 10th house, their career path may not follow a straight line. They may be drawn to work that feels creative, helpful, emotional, spiritual, or hard to define at first. They may need time to understand what kind of public role actually fits them."
      : "With Pisces on the 10th house, your career path may not follow a straight line. You may be drawn to work that feels creative, helpful, emotional, spiritual, or hard to define at first. You may need time to understand what kind of public role actually fits you.";
  }

  if (house === 5 && sign === "Aquarius") {
    return context === "friend"
      ? "With Aquarius on the 5th house, they may not enjoy what they are supposed to enjoy. Their creativity can be more experimental, unusual, thoughtful, or outside the usual style. They may need freedom to make something strange, personal, or different before it starts to feel like theirs."
      : "With Aquarius on the 5th house, you may not enjoy what you are supposed to enjoy. Your creativity can be more experimental, unusual, thoughtful, or outside the usual style. You may need freedom to make something strange, personal, or different before it starts to feel like yours.";
  }

  if (house === 9 && sign === "Gemini") {
    return context === "friend"
      ? "With Gemini on the 9th house, they may look for meaning by asking questions, comparing ideas, and talking things through. They may not hold one fixed belief forever. Their views can change when they get new information, meet different people, study something closely, or hear another side of the story."
      : "With Gemini on the 9th house, you may look for meaning by asking questions, comparing ideas, and talking things through. You may not hold one fixed belief forever. Your views can change when you get new information, meet different people, study something closely, or hear another side of the story.";
  }

  return sentences[sign] ?? `With ${sign || "the house sign"} on the ${ordinalHouse(house)} house, ${subject} meet ${topic} through the behavior of that sign.`;
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

  return functions[ruler] ?? `how this part of ${context === "friend" ? "them" : "you"} finds a workable rhythm`;
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

  return `This house can stay quiet for stretches of time. When ${rulerLabel} is activated, or when current planets cross ${housePhrase}, ${behavior}`;
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

type EmptyHouseSlot = "card-summary" | "house-sign" | "ruler-guide" | "ruler-placement" | "activation" | "hint";
type NormalizedEmptyHouseSection = NormalizedSurfaceSection<EmptyHouseSlot> & {
  heading: string;
};
type NormalizedEmptyHouseArticle = {
  surface: "empty-house";
  status: NormalizedSurfaceStatus;
  sections: NormalizedEmptyHouseSection[];
};

function normalizedEmptyHouseSection(
  slot: EmptyHouseSlot,
  heading: string,
  body: string,
  sourceKeys: string[],
  required = false
): NormalizedEmptyHouseSection | null {
  const copy = body.trim();

  if (!isReaderFacingCopy(copy)) {
    return null;
  }

  return {
    slot,
    required,
    layer: "fallback",
    tier: "source-based-empty-house",
    sourceKeys,
    heading,
    body: copy
  };
}

function normalizeEmptyHouseCardSurface(
  house: number,
  natalSky: SkySnapshot | null,
  context: "self" | "friend" = "self",
  ownerName?: string,
  ownerPronouns?: PronounChoice | null
): NormalizedEmptyHouseArticle {
  void ownerName;
  void ownerPronouns;
  const { sign, ruler, rulerPosition } = emptyHouseContext(house, natalSky);
  let rendered: ReturnType<typeof fallbackRendererV3.renderNatalEmptyHouse>;

  try {
    rendered = fallbackRendererV3.renderNatalEmptyHouse({
      house,
      ruler: normalizeContentIdPart(ruler),
      rulerHouse: rulerPosition?.house,
      rulerSign: normalizeContentIdPart(rulerPosition?.sign ?? ""),
      sign: normalizeContentIdPart(sign),
      voice: context === "self" ? "you" : "they"
    });
  } catch (error) {
    if (error instanceof FallbackV3SourceGapError) {
      return {
        surface: "empty-house",
        status: "not-servable",
        sections: []
      };
    }

    throw error;
  }

  const body = firstReaderFacingCopy(readerFacingParagraphs(rendered.parts));
  const section = normalizedEmptyHouseSection(
    "card-summary",
    rendered.headline || emptyHouseTitle(house, natalSky),
    body,
    [
      "tldrastro-fallback-architecture-v3",
      rendered.templateKey,
      `empty-house.${house}`,
      sign ? `empty-house.sign.${normalizeContentIdPart(sign)}` : "",
      ruler ? `empty-house.ruler.${normalizeContentIdPart(ruler)}` : "",
      rulerPosition?.house ? `empty-house.ruler-house.${rulerPosition.house}` : ""
    ].filter(Boolean),
    false
  );

  return {
    surface: "empty-house",
    status: section ? "partial" : "not-servable",
    sections: section ? [section] : []
  };
}

function emptyHouseCardDescription(
  house: number,
  natalSky: SkySnapshot | null,
  context: "self" | "friend" = "self",
  ownerName?: string,
  ownerPronouns?: PronounChoice | null
): string {
  return normalizeEmptyHouseCardSurface(house, natalSky, context, ownerName, ownerPronouns).sections[0]?.body ?? "";
}

function normalizeEmptyHouseDetailSurface({
  compositionContext,
  context,
  house,
  natalSky,
  ownerAwareParagraph,
  ruler,
  rulerPosition,
  sign
}: {
  compositionContext: "self" | "friend";
  context: "self" | "friend";
  house: number;
  natalSky: SkySnapshot | null;
  ownerAwareParagraph: (value: string) => string;
  ruler: string;
  rulerPosition: PlanetPosition | null;
  sign: string;
}): NormalizedEmptyHouseArticle {
  void compositionContext;
  void context;
  void natalSky;
  void ownerAwareParagraph;
  const sourceBase = [
    `empty-house.${house}`,
    sign ? `empty-house.sign.${normalizeContentIdPart(sign)}` : "",
    ruler ? `empty-house.ruler.${normalizeContentIdPart(ruler)}` : "",
    rulerPosition?.house ? `empty-house.ruler-house.${rulerPosition.house}` : ""
  ].filter(Boolean);

  try {
    const rendered = fallbackRendererV3.renderNatalEmptyHouse({
      house,
      ruler: normalizeContentIdPart(ruler),
      rulerHouse: rulerPosition?.house,
      rulerSign: normalizeContentIdPart(rulerPosition?.sign ?? ""),
      sign: normalizeContentIdPart(sign),
      voice: context === "self" ? "you" : "they"
    });
    const body = readerFacingParagraphs(rendered.parts).join("\n\n");
    const section = normalizedEmptyHouseSection(
      "house-sign",
      rendered.headline || `${ordinalHouse(house)} house sign`,
      body,
      [
        "tldrastro-fallback-architecture-v3",
        rendered.templateKey,
        ...sourceBase
      ],
      true
    );

    return {
      surface: "empty-house",
      status: section ? "partial" : "not-servable",
      sections: section ? [section] : []
    };
  } catch (error) {
    if (!(error instanceof FallbackV3SourceGapError)) {
      throw error;
    }
  }

  return {
    surface: "empty-house",
    status: "not-servable",
    sections: []
  };
}

function emptyHouseDetailArticle(
  house: number,
  natalSky: SkySnapshot | null,
  context: "self" | "friend" = "self",
  ownerName?: string,
  ownerPronouns?: PronounChoice | null
): YouTransitArticle {
  const { sign, ruler, rulerPosition } = emptyHouseContext(house, natalSky);
  const title = emptyHouseTitle(house, natalSky);
  const rulerLabel = displayRulerName(ruler || "the house ruler");
  const emptyHouseHint = "Everyone has all 12 houses. An empty house means no natal planets sit there. It still operates, but it may have less pull and may not feel like a constant focus in your life. To understand it, look at the whole-sign house sign and the planet that rules that sign. A birth chart can name a pattern before it feels obvious. This area may become clearer when its ruler is activated or when current planets cross it.";
  const compositionContext = context === "friend" && ownerName ? "self" : context;
  const ownerAwareParagraph = (value: string) =>
    context === "friend" && ownerName
      ? natalGeneratedCopyForOwner(value, ownerName, "person", ownerPronouns)
      : value;
  const normalized = normalizeEmptyHouseDetailSurface({
    compositionContext,
    context,
    house,
    natalSky,
    ownerAwareParagraph,
    ruler,
    rulerPosition,
    sign
  });
  const paragraphs = normalized.sections.map((section) => taggedSectionBody(section));

  return {
    id: `empty-house-${house}-${normalizeContentIdPart(sign || "unknown")}`,
    title,
    glyph: sign ? zodiacSignGlyphs[sign] ?? "○" : "○",
    subtitle: `${ordinalHouse(house)} House`,
    lensHint: ownerAwareParagraph(emptyHouseHint),
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

  return dedupeTransitAxisContacts(rankedTransitItems(buildNatalTransitItems(currentSky.positions, natalPositions, sunriseOrb), timing));
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
    const tierDiff = skyAspectConditionTier(first) - skyAspectConditionTier(second);

    if (tierDiff !== 0) {
      return tierDiff;
    }

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

function skyAspectConditionTier(aspect: SkySnapshot["aspects"][number]) {
  if (aspect.conditions?.applying && aspect.conditions.perfects) {
    return 0;
  }

  if (aspect.conditions?.applying) {
    return 1;
  }

  return 2;
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

function friendUpdateSummary(
  chart: ManualChart,
  transit?: TransitItem,
  generatedContent?: GeneratedContentMap,
  generatedAt = new Date().toISOString()
) {
  void generatedContent;
  if (!transit) {
    return "";
  }

  return normalizedSurfacePreview(normalizePersonalTransitSurface(transit, generatedAt));
}

function friendTransitSummary(
  transit: TransitItem,
  generatedContent: GeneratedContentMap,
  ownerName: string,
  ownerPronouns?: PronounChoice | null,
  generatedAt = new Date().toISOString()
) {
  void generatedContent;
  void ownerName;
  void ownerPronouns;

  return normalizedSurfacePreview(normalizePersonalTransitSurface(transit, generatedAt));
}

function friendTransitFactLine(transit: TransitItem, ownerName: string) {
  const technicalAspect = transitAspectTechnicalVerb(transit.aspect);
  const angleHouse = isChartAnglePoint(transit.natalPoint) ? "" : transit.natalHouse ? ` in the ${ordinalHouse(transit.natalHouse)} house` : "";

  return `${technicalAspect} ${possessiveLabel(ownerName)} natal ${transit.natalPoint} in ${transit.natalSign}${angleHouse}`;
}

function personalTransitDisplayTitle(transit: TransitItem) {
  return `${transit.transitPlanet} ${titleCase(transit.aspect)} ${transit.natalPoint}`;
}

function personalTransitPackageWindow(transit: TransitItem, generatedAt: string) {
  const window = transitItemActiveWindow(transit, generatedAt);
  const referenceDate = new Date(generatedAt);

  if (window.end >= referenceDate) {
    return `Until ${formatEditorialDate(window.end, true)}`;
  }

  return aspectTimingDisplayForWindow(window.start, window.end, referenceDate, true).rangeLabel;
}

function personalTransitPackageContentKey(transit: TransitItem, generatedAt: string) {
  const normalizedAspect = normalizeFallbackV3Aspect(transit.aspect);

  if (!normalizedAspect) {
    return null;
  }

  try {
    const rendered = transitSynastryFallbackRendererV3.renderTransitAspect({
      aspect: normalizedAspect,
      natal: normalizeContentIdPart(transit.natalPoint),
      sign: transit.transitSign ? normalizeContentIdPart(transit.transitSign) : undefined,
      transiting: normalizeContentIdPart(transit.transitPlanet),
      window: personalTransitPackageWindow(transit, generatedAt)
    });

    return rendered.contentKey ?? null;
  } catch (error) {
    if (error instanceof FallbackV3SourceGapError) {
      return null;
    }

    throw error;
  }
}

function dedupeSameBeatPersonalTransits<T extends TransitItem>(transits: T[], generatedAt: string) {
  const seenBeatKeys = new Set<string>();

  return transits.filter((transit) => {
    const contentKey = personalTransitPackageContentKey(transit, generatedAt);
    const beatKey = transitV3SameBeatKeyForContentKey(contentKey);

    if (!beatKey) {
      return true;
    }

    if (seenBeatKeys.has(beatKey)) {
      return false;
    }

    seenBeatKeys.add(beatKey);
    return true;
  });
}

function personalTransitMadlibFallbackSection(
  transit: TransitItem,
  generatedAt: string
): NormalizedPersonalTransitSection | null {
  const normalizedAspect = normalizeFallbackV3Aspect(transit.aspect);

  if (!normalizedAspect) {
    return null;
  }

  try {
    const rendered = transitSynastryFallbackRendererV3.renderTransitAspect({
      aspect: normalizedAspect,
      natal: normalizeContentIdPart(transit.natalPoint),
      sign: transit.transitSign ? normalizeContentIdPart(transit.transitSign) : undefined,
      transiting: normalizeContentIdPart(transit.transitPlanet),
      window: personalTransitPackageWindow(transit, generatedAt)
    });
    const body = readerFacingParagraphs(rendered.parts).join("\n\n");

    if (!body || !isReaderFacingCopy(body)) {
      return null;
    }

    return {
      slot: "meaning",
      required: true,
      layer: rendered.templateKey.startsWith("authored/") ? "authored" : "fallback",
      tier: rendered.templateKey.startsWith("authored/")
        ? "fallback-architecture-v3-authored"
        : "fallback-architecture-v3",
      sourceKeys: [
        "tldrastro-fallback-architecture-v3",
        rendered.contentKey ?? "",
        rendered.templateKey
      ].filter(Boolean),
      heading: rendered.headline || personalTransitDisplayTitle(transit),
      body
    };
  } catch (error) {
    if (error instanceof FallbackV3SourceGapError) {
      return null;
    }

    throw error;
  }
}

function normalizePersonalTransitSurface(
  transit: TransitItem,
  generatedAt: string
): NormalizedPersonalTransitArticle {
  const fallbackSection = personalTransitMadlibFallbackSection(transit, generatedAt);
  const sections = fallbackSection ? [fallbackSection] : [];

  return {
    surface: "personal-transit",
    status: fallbackSection ? (fallbackSection.layer === "authored" ? "servable" : "partial") : "not-servable",
    sections
  };
}

function normalizeTransitHouseSurface(
  transit: TransitItem,
  house: number,
  generatedAt: string
): NormalizedTransitHouseArticle {
  let section: NormalizedTransitHouseSection | null = null;

  try {
    const rendered = transitSynastryFallbackRendererV3.renderTransitHouse({
      house,
      planet: normalizeContentIdPart(transit.transitPlanet),
      sign: normalizeContentIdPart(transit.transitSign ?? ""),
      motion: transit.transitMotion,
      window: personalTransitPackageWindow(transit, generatedAt)
    });
    const body = readerFacingParagraphs(rendered.parts).join("\n\n");

    section = body && isReaderFacingCopy(body)
      ? {
          slot: "house-activation",
          required: true,
          layer: "fallback",
          tier: "fallback-architecture-v3",
          sourceKeys: [
            "tldrastro-fallback-architecture-v3",
            rendered.contentKey ?? "",
            rendered.templateKey,
            `fallback-template/transit.house`,
            `fallback-vocab/house-topic/${house}`
          ].filter(Boolean),
          heading: rendered.headline || `${transit.transitPlanet} through your ${ordinalHouse(house)} house`,
          body
        }
      : null;
  } catch (error) {
    if (!(error instanceof FallbackV3SourceGapError)) {
      throw error;
    }
  }

  return {
    surface: "transit-house",
    status: section ? "partial" : "not-servable",
    sections: section ? [section] : []
  };
}

function normalizedSurfacePreview(article: NormalizedSurfaceArticle<string, string>) {
  const section = article.sections[0];

  return section?.body ? textPreview(taggedSectionBody(section)) : "";
}

function stripSkyAspectTimingPrefix(summary: string, timing: { durationLabel: string; rangeLabel: string }) {
  const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const leadingTiming = [timing.rangeLabel, timing.durationLabel]
    .map((label) => label.trim())
    .filter(Boolean);
  let cleaned = summary.trim();

  for (const label of leadingTiming) {
    cleaned = cleaned.replace(new RegExp(`^${escapePattern(label)}\\s*,\\s*`, "i"), "");
  }

  cleaned = cleaned.replace(/^(Today|Tonight|This week|This month)\s*,\s*/i, "");

  return cleaned.replace(/^([a-z])/, (letter) => letter.toUpperCase());
}

function normalizeMadlibCardSurface({
  body,
  sourceKeys,
  surface,
  slot,
  tier = "source-based-madlib"
}: {
  body: string | null | undefined;
  sourceKeys: string[];
  surface: string;
  slot: string;
  tier?: string;
}): NormalizedSurfaceArticle<string, string> {
  const cleaned = body?.trim() ?? "";
  const section = isReaderFacingCopy(cleaned)
    ? {
        slot,
        required: false,
        layer: "fallback" as const,
        tier,
        sourceKeys,
        body: cleaned
      }
    : null;

  return {
    surface,
    status: section ? "partial" : "not-servable",
    sections: section ? [section] : []
  };
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

  const relationshipKeys = [baseKey, reversedBaseKey];

  relationshipKeys.forEach((key) => {
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

function compositePlacementContentKeys(point: string, sign: string, house?: number | null) {
  const keys = new Set<string>();

  if (house) {
    keys.add(compositeHouseContentKey(point, house));
    keys.add(`composite-${normalizeContentIdPart(point)}-house-${house}`);
    keys.add(`composite-${normalizeContentIdPart(point)}-house${house}`);
  }

  keys.add(compositeSignContentKey(point, sign));
  keys.add(compositePointContentKey(point));

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

function sourceGroundedHouseOverlaySection({
  contentKeys,
  heading
}: {
  contentKeys: string[];
  heading: string;
}): NormalizedHouseOverlaySection | null {
  const fallback = relationshipKnowledgeFallbackByKeys(contentKeys);
  const body = contentFallbackParagraphs(fallback).join("\n\n");

  if (!body) {
    return null;
  }

  return {
    slot: "overlay-meaning",
    required: true,
    layer: "fallback",
    tier: "relationship-knowledge",
    sourceKeys: contentKeys,
    heading,
    body
  };
}

function houseOverlayMadlibSection({
  direction,
  heading,
  house,
  planet
}: {
  direction: string;
  heading: string;
  house: number;
  planet: string;
}): NormalizedHouseOverlaySection | null {
  const houseTopic = houseLifeAreas[house] ?? readableHouseTopic(house);
  const planetTopic = relationshipPlanetTopicSlot(planet, "friend");
  const body = `${direction} This brings ${planetTopic} into the relationship through ${houseTopic}. Notice where the house topic becomes easier to feel, name, or respond to when this person is close.`;

  if (!isReaderFacingCopy(body)) {
    return null;
  }

  return {
    slot: "overlay-meaning",
    required: true,
    layer: "fallback",
    tier: "source-based-madlib",
    sourceKeys: [
      `relationshipPlanetTopic.${normalizeContentIdPart(planet)}`,
      `houseLifeAreas.${house}`
    ],
    heading,
    body
  };
}

function normalizeHouseOverlaySurface({
  contentKeys,
  direction,
  heading,
  house,
  planet
}: {
  contentKeys: string[];
  direction: string;
  heading: string;
  house: number;
  planet: string;
}): NormalizedHouseOverlayArticle {
  const sourceGroundedSection = sourceGroundedHouseOverlaySection({ contentKeys, heading });
  const fallbackSection = sourceGroundedSection ? null : houseOverlayMadlibSection({ direction, heading, house, planet });
  const sections = sourceGroundedSection ? [sourceGroundedSection] : fallbackSection ? [fallbackSection] : [];

  return {
    surface: "house-overlay",
    status: sourceGroundedSection ? "servable" : fallbackSection ? "partial" : "not-servable",
    sections
  };
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
    1: "Can I still meet life as the same version of myself?",
    2: "Does this actually support my stability, or am I carrying it out of habit?",
    3: "Is the way I am communicating, learning, and navigating daily life still working?",
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
    Ascendant: "how they meet the world and how quickly other people read their presence",
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

function transitDirectionPhrase(direction?: TransitDirection) {
  if (direction === "applying") return "forming";
  if (direction === "separating") return "separating from";
  return "in";
}

function circleTransitParagraph(chart: ManualChart, transit: TransitItem, currentSky: SkySnapshot, timing: FriendTimingContext) {
  const timingLabel = transitItemTimingDisplay(transit, currentSky.generatedAt).label;
  const direction = transitDirectionPhrase(transit.direction);
  const relevance = transit.natalPoint === timing.lordOfYear
    ? `Since ${transit.natalPoint} is the lord of the year, this ties directly into the main story.`
    : ["Ascendant", "Descendant"].includes(transit.natalPoint)
      ? "Since this touches one of the relationship and visibility points in the chart, it can shape how the connection is read from the outside and what each person assumes is visible."
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
    6: `If you are close to ${chart.displayName}, take the small pressures seriously. Work, health, routine, and exhaustion may be saying more than they can easily explain.`,
    7: `If you are close to ${chart.displayName}, stay clear and fair. This is not the best timing for guessing games if the relationship needs honest terms.`,
    8: `If you are close to ${chart.displayName}, move carefully around trust, money, intimacy, and control. They may need honesty without pressure.`,
    9: `If you are close to ${chart.displayName}, give their questions room. They may be revising what they believe before they know how to describe the new shape of it.`,
    10: `If you are close to ${chart.displayName}, recognize the pressure of being visible. Support may look like respecting the responsibility they are carrying.`,
    11: `If you are close to ${chart.displayName}, make room for questions of belonging. They may be learning which friendships, groups, and futures still feel real.`,
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
          "The details will be personal to each person, but the group question is similar: What needs space, rest, or privacy before it can be understood?"
        ]
      : [
          `For this group, the focus is on ${groupHouseThemes(house)}. The details will be personal to each person, but the group question is similar: ${houseRealLifeQuestion(house)}`
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
    return `${chart.displayName} is part of this shared ${planet} pattern, but the exact chart contact is not available yet. Read this as a signal to look for ${groupPlanetThemes(planet)} in the way they are meeting the moment.`;
  }

  const timing = friendTimingContext(chart, currentSky);
  const timingLabel = transitItemTimingDisplay(transit, currentSky.generatedAt).label;
  const direction = transitDirectionPhrase(transit.direction);
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
    `If you are close to ${chart.displayName}, the clearest evidence is in real behavior rather than the headline alone. ${groupPlanetExamples(planet)}`
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
  const direction = transitDirectionPhrase(transit.direction);

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
      `The feed card is showing an annual timing pattern: more than one person has ${planet} as lord of the year. That means ${groupPlanetThemes(planet)} may be setting the tone in different charts, even when each person is meeting it in a different part of life.`
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
  const normalizeHighlightBody = (body: string, sourceKeys: string[]) => normalizedSurfacePreview(normalizeMadlibCardSurface({
    body,
    sourceKeys,
    surface: "compatibility-highlight",
    slot: "summary"
  }));
  const highlights = [
    {
      title: "Chart signature",
      body: normalizeHighlightBody(
        `${chart.displayName}'s chart opens with Sun in ${friendBigThree.sun}, Moon in ${friendBigThree.moon}, and ${friendBigThree.rising} rising. This gives the relationship its first layer: how they enter life, what they need emotionally, and how they tend to meet the world.`,
        ["manualChart.bigThree", "madlib.compatibilityHighlight.chartSignature"]
      )
    }
  ].filter((highlight) => highlight.body);

  if (!profileNatalSky || !friendSky) {
    const body = normalizeHighlightBody(
      "Add complete birth details for both people to see where the connection feels natural, where it asks for more care, and what the current timing is bringing up.",
      ["madlib.compatibilityHighlight.missingChart"]
    );
    if (body) {
      highlights.push({
        title: "Add both charts",
        body
      });
    }
    return highlights;
  }

  const synastryHits = profileNatalSky.positions.flatMap((yourPosition) => (
    friendSky.positions.flatMap((theirPosition) => {
      const separation = angularDistance(zodiacLongitude(yourPosition), zodiacLongitude(theirPosition));
      const aspect = transitAspectDefinitions
        .map((definition) => ({ ...definition, orbValue: Math.abs(separation - definition.exact) }))
        .filter((definition) => definition.orbValue <= synastryAspectOrbLimit(definition.type, theirPosition.planet, yourPosition.planet))
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

  const topHit = synastryHits.find((hit) => synastryContactSignalTier(hit.theirPosition.planet, hit.yourPosition.planet) !== "background")
    ?? synastryHits[0];
  if (topHit) {
    const title = relationshipThemeTitle(topHit.theirPosition.planet, topHit.yourPosition.planet, topHit.aspect.type);
    const contact = {
      id: `${chart.id}-${topHit.theirPosition.planet}-${topHit.aspect.type}-${topHit.yourPosition.planet}`.toLowerCase().replace(/\s+/g, "-"),
      friendPoint: {
        name: topHit.theirPosition.planet,
        glyph: topHit.theirPosition.glyph,
        longitude: zodiacLongitude(topHit.theirPosition),
        role: comparisonPointRole(topHit.theirPosition.planet)
      },
      yourPoint: {
        name: topHit.yourPosition.planet,
        glyph: topHit.yourPosition.glyph,
        longitude: zodiacLongitude(topHit.yourPosition),
        role: comparisonPointRole(topHit.yourPosition.planet)
      },
      aspect: topHit.aspect.type,
      orb: topHit.aspect.orbValue,
      score: topHit.score,
      tone: synastryTone(topHit.aspect.type),
      contentKeys: synastryContactContentKeys(topHit.theirPosition.planet, topHit.aspect.type, topHit.yourPosition.planet)
    };
    const normalized = normalizeSynastryContactSurface(
      chart.displayName,
      "You",
      true,
      contact,
      generatedContent,
      chart.pronouns
    );
    const body = repairRelationshipFallbackGrammar(
      relationshipGeneratedCopyForPerspective(
        normalizedSurfacePreview(normalized),
        chart.displayName,
        "You",
        true
      ),
      {
        primaryName: chart.displayName,
        comparisonName: "You",
        comparisonIsSelf: true,
        primaryPoint: topHit.theirPosition.planet,
        comparisonPoint: topHit.yourPosition.planet,
        aspect: topHit.aspect.type,
        romanticAllowed: false
      }
    );
    highlights.push({
      title,
      body
    });
  }

  const yourElement = profileNatalSky.dominantElement;
  const theirElement = friendSky.dominantElement;
  const elementBody = normalizeHighlightBody(
    yourElement === theirElement
      ? `Both charts lean ${yourElement.toLowerCase()}. The connection may feel familiar because you process life through a similar element, but that can also reinforce the same blind spots.`
      : `Your chart leans ${yourElement.toLowerCase()}; ${chart.displayName}'s leans ${theirElement.toLowerCase()}. Notice where that difference creates useful contrast instead of treating it as a mismatch.`,
    ["manualChart.dominantElement", "madlib.compatibilityHighlight.element"]
  );
  if (elementBody) {
    highlights.push({
      title: yourElement === theirElement ? `${yourElement} emphasis` : `${yourElement} meets ${theirElement}`,
      body: elementBody
    });
  }

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

const synastryPersonalPoints = new Set(["sun", "moon", "mercury", "venus", "mars"]);
const synastryAngles = new Set(["ascendant", "midheaven"]);
const synastrySocialOuterPoints = new Set(["jupiter", "saturn", "uranus", "neptune", "pluto"]);

function synastryPointKey(point: string) {
  return normalizeContentIdPart(point);
}

function isSynastryPersonalOrAngle(point: string) {
  const key = synastryPointKey(point);
  return synastryPersonalPoints.has(key) || synastryAngles.has(key);
}

function isSameSocialOrOuterSynastryContact(firstPoint: string, secondPoint: string) {
  const firstKey = synastryPointKey(firstPoint);
  const secondKey = synastryPointKey(secondPoint);
  return firstKey === secondKey && synastrySocialOuterPoints.has(firstKey);
}

function synastryAspectOrbLimit(aspect: string, firstPoint: string, secondPoint: string) {
  const baseLimits: Record<string, number> = {
    conjunction: 4,
    opposition: 3.5,
    square: 3.5,
    trine: 3,
    sextile: 2.5
  };
  const baseLimit = baseLimits[aspect] ?? 3;
  const firstIsPersonalOrAngle = isSynastryPersonalOrAngle(firstPoint);
  const secondIsPersonalOrAngle = isSynastryPersonalOrAngle(secondPoint);

  if (isSameSocialOrOuterSynastryContact(firstPoint, secondPoint)) {
    return Math.min(baseLimit, 1.25);
  }

  if (firstIsPersonalOrAngle && secondIsPersonalOrAngle) {
    return baseLimit + 0.5;
  }

  if (firstIsPersonalOrAngle || secondIsPersonalOrAngle) {
    return baseLimit;
  }

  return Math.min(baseLimit, 2);
}

function synastryWheelAspectOrbLimit(aspect: string, firstPoint: string, secondPoint: string) {
  const listLimit = synastryAspectOrbLimit(aspect, firstPoint, secondPoint);

  if (isSameSocialOrOuterSynastryContact(firstPoint, secondPoint)) {
    return listLimit;
  }

  if (isSynastryPersonalOrAngle(firstPoint) || isSynastryPersonalOrAngle(secondPoint)) {
    return Math.max(listLimit, 4.5);
  }

  return listLimit;
}

function synastryContactSignalTier(firstPoint: string, secondPoint: string) {
  if (isSameSocialOrOuterSynastryContact(firstPoint, secondPoint)) {
    return "background";
  }

  if (isSynastryPersonalOrAngle(firstPoint) || isSynastryPersonalOrAngle(secondPoint)) {
    return "primary";
  }

  if ([firstPoint, secondPoint].includes("Saturn")) {
    return "secondary";
  }

  return "background";
}

function synastryWheelAspectLines(profileNatalSky: SkySnapshot | null, chart: ManualChart): InterChartAspectLine[] {
  const friendPoints = comparisonPointsFromSky(chart.natalChart ?? null);
  const yourPoints = comparisonPointsFromSky(profileNatalSky);

  return friendPoints
    .flatMap((friendPoint) => yourPoints.flatMap((yourPoint) => {
      const separation = angularDistance(friendPoint.longitude, yourPoint.longitude);
      const aspect = transitAspectDefinitions
        .map((definition) => ({ ...definition, orbValue: Math.abs(separation - definition.exact) }))
        .filter((definition) => definition.orbValue <= synastryWheelAspectOrbLimit(definition.type, friendPoint.name, yourPoint.name))
        .sort((first, second) => first.orbValue - second.orbValue)[0];

      if (!aspect) {
        return [];
      }

      return [{
        id: `${chart.id}-wheel-${friendPoint.name}-${aspect.type}-${yourPoint.name}`.toLowerCase().replace(/\s+/g, "-"),
        fromLongitude: friendPoint.longitude,
        toLongitude: yourPoint.longitude,
        type: aspect.type,
        orb: aspect.orbValue,
        score: synastryContactScore(friendPoint.name, yourPoint.name, aspect.type, aspect.orbValue)
      }];
    }))
    .sort((first, second) => second.score - first.score || first.orb - second.orb)
    .slice(0, 18)
    .map(({ id, fromLongitude, toLongitude, type, orb }) => ({
      id,
      fromLongitude,
      toLongitude,
      type,
      orb
    }));
}

function transitWheelAspectLines(currentSky: SkySnapshot, natalSky: SkySnapshot | null, transits: TransitItem[]): InterChartAspectLine[] {
  if (!natalSky) {
    return [];
  }

  const transitPositionsByPlanet = new Map(currentSky.positions.map((position) => [position.planet, position]));
  const natalTargetsByPoint = new Map(natalTransitTargets(natalSky).map((position) => [position.planet, position]));

  return transits.flatMap((transit) => {
    const transitPosition = transitPositionsByPlanet.get(transit.transitPlanet);
    const natalPosition = natalTargetsByPoint.get(transit.natalPoint);

    if (!transitPosition || !natalPosition) {
      return [];
    }

    return [{
      id: `transit-wheel-${transit.id}`,
      fromLongitude: zodiacLongitude(transitPosition),
      toLongitude: zodiacLongitude(natalPosition),
      type: transit.aspect,
      orb: transitOrbValue(transit),
      fromPointId: `transit:${transitPosition.planet}`,
      toPointId: natalPosition.planet
    }];
  });
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
    1: "identity, appearance, first impressions, and the way someone enters the world",
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
  const signalTier = synastryContactSignalTier(friendPoint, yourPoint);
  const sameSocialOrOuterPoint = signalTier === "background" && isSameSocialOrOuterSynastryContact(friendPoint, yourPoint);
  const personalPairBonus = ["Sun", "Moon", "Mercury", "Venus", "Mars"].includes(friendPoint)
    && ["Sun", "Moon", "Mercury", "Venus", "Mars", "Ascendant"].includes(yourPoint)
    ? 12
    : 0;
  const saturnBondBonus = [friendPoint, yourPoint].includes("Saturn") && !sameSocialOrOuterPoint ? 5 : 0;
  const angleBonus = [friendPoint, yourPoint].some((point) => ["Ascendant", "Midheaven"].includes(point)) ? 8 : 0;
  const signalBonus = signalTier === "primary" ? 14 : signalTier === "secondary" ? 5 : 0;
  const generationalContextPenalty = sameSocialOrOuterPoint ? 32 : 0;

  return synastryOrbWeight(orb)
    + synastryAspectWeight(aspect)
    + synastryPointWeight(friendPoint)
    + synastryPointWeight(yourPoint)
    + personalPairBonus
    + saturnBondBonus
    + angleBonus
    + signalBonus
    - generationalContextPenalty;
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
  const firstKey = normalizeContentIdPart(firstPoint);
  const secondKey = normalizeContentIdPart(secondPoint);

  if (firstKey === secondKey) {
    const samePointTitles: Record<string, Partial<Record<string, string>>> = {
      mercury: {
        conjunction: "You Think Along Similar Lines",
        opposition: "You Argue From Different Angles",
        square: "You Think Differently",
        trine: "Conversation Comes Easily",
        sextile: "You Help Each Other Clarify"
      },
      venus: {
        conjunction: "You Recognize Similar Preferences",
        opposition: "You Compare What Feels Worth It",
        square: "You Want Different Kinds of Ease",
        trine: "You Enjoy Similar Things",
        sextile: "You Make Time Together Easier"
      },
      mars: {
        conjunction: "You Move With Similar Drive",
        opposition: "You Compete Over the Method",
        square: "Your Paces Clash",
        trine: "You Act Well Together",
        sextile: "You Can Coordinate Effort"
      },
      jupiter: {
        conjunction: "You Encourage Similar Risks"
      },
      saturn: {
        conjunction: "You Understand the Same Pressures",
        square: "You Reinforce Each Other's Standards",
        opposition: "You Recognize the Same Limits",
        trine: "You Share a Sense of Duty",
        sextile: "You Build Trust Slowly"
      }
    };
    const title = samePointTitles[firstKey]?.[aspect];

    if (title) {
      return title;
    }
  }

  const directionalTitles: Record<string, Partial<Record<string, string>>> = {
    "saturn-ascendant": {
      conjunction: "Their Standards Shape Your First Move",
      square: "Their Standards Affect Your Confidence"
    },
    "mars-midheaven": {
      conjunction: "Their Initiative Pushes Your Ambitions"
    },
    "sun-mars": {
      conjunction: "They Bring Out Your Initiative"
    },
    "venus-mars": {
      conjunction: "Preference Meets Action",
      square: "Timing and Tone Need Agreement"
    },
    "neptune-mercury": {
      square: "Possibility Needs Clear Language"
    },
    "pluto-mars": {
      conjunction: "Pressure Needs a Clear Goal"
    }
  };
  const directionalTitle = directionalTitles[`${firstKey}-${secondKey}`]?.[aspect];

  if (directionalTitle) {
    return directionalTitle;
  }

  const firstLabel = titleCase(firstPoint);
  const secondLabel = titleCase(secondPoint);
  const aspectLabel = titleCase(aspect);

  return `${firstLabel} ${aspectLabel} ${secondLabel}`;
}

function relationshipAspectTitleFromSlots(slots: TemplateSlotValues) {
  return `${slots.personAPossessive} ${slots.planetA} ${slots.aspect} ${slots.personBPossessive} ${slots.planetB}`;
}

function synastryContactContentKeys(
  firstPoint: string,
  aspect: string,
  secondPoint: string,
  relationshipType?: string | null
) {
  const authoredIds = [
    synastryAuthoredContentId(firstPoint, aspect, secondPoint),
    synastryAuthoredContentId(secondPoint, aspect, firstPoint)
  ];
  const richKeys = richSynastryContactContentKeys(firstPoint, aspect, secondPoint, relationshipType);
  const relationshipKeys = relationshipAspectContentKeys(firstPoint, aspect, secondPoint, "synastry");

  if (!isSamePlanetSynastryContact(firstPoint, secondPoint)) {
    return [
      ...authoredIds,
      ...richKeys,
      ...relationshipKeys
    ];
  }

  return [
    ...authoredIds,
    ...samePlanetSynastryContentKeys(firstPoint, aspect, relationshipType),
    ...richKeys,
    ...relationshipKeys
  ];
}

function richSynastryContactContextKeys(relationshipType?: string | null) {
  const normalized = normalizeRelationshipContextKey(relationshipType);
  const contextKeyByRelationship: Partial<Record<ReturnType<typeof normalizeRelationshipContextKey>, string>> = {
    friend: "friends",
    acquaintance: "friends",
    "romantic-partner": "partner",
    ex: "ex",
    situationship: "partner",
    family: "family",
    coworker: "coworkers",
    business: "coworkers",
    "teacher-mentor": "coworkers",
    "employer-manager": "coworkers",
    "roommate-neighbor": "friends"
  };
  const contextKey = contextKeyByRelationship[normalized] ?? "friends";

  return Array.from(new Set([contextKey, "core"]));
}

function richSynastryContactContentKeys(
  firstPoint: string,
  aspect: string,
  secondPoint: string,
  relationshipType?: string | null
) {
  const first = normalizeContentIdPart(firstPoint);
  const aspectKey = normalizeContentIdPart(aspect);
  const second = normalizeContentIdPart(secondPoint);
  const pairKeys = Array.from(new Set([
    `${first}-${aspectKey}-${second}`,
    `${second}-${aspectKey}-${first}`
  ]));
  const contextKeys = richSynastryContactContextKeys(relationshipType);

  return pairKeys.flatMap((pairKey) => (
    contextKeys.map((contextKey) => `fallback-hook/friends.synastry-contact/${pairKey}/${contextKey}`)
  ));
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
  return possessiveName(name);
}

function escapeRegExpLiteral(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ownerDisplayPronouns(ownerName: string, ownerPronouns?: PronounChoice | null) {
  return resolveThirdPersonReference({ name: ownerName, pronouns: ownerPronouns });
}

function collapseRepeatedOwnerNameMentions(
  text: string,
  ownerName: string,
  pronouns: PersonReference,
  keepFirstNamedMention = true
) {
  const trimmedName = ownerName.trim();

  if (!trimmedName || trimmedName.toLowerCase() === pronouns.subject.toLowerCase()) {
    return text;
  }

  const namePattern = escapeRegExpLiteral(trimmedName);
  const mentionPattern = new RegExp(`\\b${namePattern}(?:'s)?\\b`, "g");
  let hasKeptNamedMention = !keepFirstNamedMention;

  return text
    .replace(mentionPattern, (match, offset: number, fullText: string) => {
      if (!hasKeptNamedMention) {
        hasKeptNamedMention = true;
        return match;
      }

      const isPossessive = match.endsWith("'s");
      const previousText = fullText.slice(Math.max(0, offset - 32), offset).toLowerCase();
      const startsSentence = /(?:^|[.!?]\s+)$/.test(fullText.slice(0, offset));

      if (isPossessive) {
        return startsSentence
          ? pronouns.possessive.charAt(0).toUpperCase() + pronouns.possessive.slice(1)
          : pronouns.possessive;
      }

      const objectContext = /\b(to|for|with|without|around|before|after|from|of|in|on|at|near|inside|outside|through|toward|towards|beside|behind|within)\s+$/.test(previousText)
        || /\b(reward|rewards|help|helps|pull|pulls|support|supports|shape|shapes)\s+$/.test(previousText);
      const replacement = objectContext ? pronouns.object : pronouns.subject;

      return startsSentence
        ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
        : replacement;
    })
    .replace(/\bthey is\b/gi, (match) => match.charAt(0) === "T" ? "They are" : "they are")
    .replace(/\bthey was\b/gi, (match) => match.charAt(0) === "T" ? "They were" : "they were")
    .replace(/\bthey has\b/gi, (match) => match.charAt(0) === "T" ? "They have" : "they have")
    .replace(/\bthey does\b/gi, (match) => match.charAt(0) === "T" ? "They do" : "they do");
}

function createNatalGeneratedCopyForOwnerConverter(ownerName: string, ownerKind: "person" | "chart" = "person", ownerPronouns?: PronounChoice | null) {
  const isChart = ownerKind === "chart";
  const firstSubject = isChart ? "This chart" : ownerName;
  const firstPossessive = isChart ? "This chart's" : possessiveLabel(ownerName);
  const pronouns = isChart ? chartPronouns : ownerDisplayPronouns(ownerName, ownerPronouns);
  let namedMentionUsed = false;

  const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
  const usesPluralVerb = (value: string) => value !== firstSubject && !isChart && pronouns.verbAgreement === "plural";
  const subject = (capitalized: boolean) => {
    if (!namedMentionUsed) {
      namedMentionUsed = true;
      return firstSubject;
    }

    return capitalized ? capitalize(pronouns.subject) : pronouns.subject;
  };
  const object = (capitalized: boolean) => {
    if (!namedMentionUsed) {
      namedMentionUsed = true;
      return firstSubject;
    }

    return capitalized ? capitalize(pronouns.object) : pronouns.object;
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

    return `${value} ${usesPluralVerb(value) ? "are" : "is"}`;
  };
  const subjectWithHave = (capitalized: boolean) => {
    const value = subject(capitalized);

    return `${value} ${usesPluralVerb(value) ? "have" : "has"}`;
  };
  const subjectWithVerb = (capitalized: boolean, baseVerb: string, thirdPersonVerb: string) => {
    const value = subject(capitalized);

    return `${value} ${usesPluralVerb(value) ? baseVerb : thirdPersonVerb}`;
  };
  const subjectWithAdverbVerb = (capitalized: boolean, adverb: string, baseVerb: string, thirdPersonVerb: string) => {
    const value = subject(capitalized);

    return `${value} ${adverb} ${usesPluralVerb(value) ? baseVerb : thirdPersonVerb}`;
  };
  const subjectWithModal = (capitalized: boolean, modal: string) => `${subject(capitalized)} ${modal}`;

  return (text: string) => {
    const converted = text
      .replace(/\bpart of you being activated\b/g, () => `part of ${object(false)} that is being activated`)
      .replace(/\bpart of you\b/g, () => `part of ${object(false)}`)
      .replace(/\bthe standards you hold yourself to live inside you\b/g, () => `the standards ${subjectWithVerb(false, "carry", "carries")} live inside ${object(false)}`)
      .replace(/\bthe authority (?:you quietly earn|they quietly earned) becomes (?:yours|theirs) to claim\b/g, () => `the authority ${subjectWithAdverbVerb(false, "quietly", "earn", "earns")} becomes ${pronouns.possessivePronoun} to claim`)
      .replace(/\bwhat gives your life\b/g, `what gives ${pronouns.possessive} life`)
      .replace(/\byourself\b/g, pronouns.reflexive)
      .replace(/\bYours\b/g, () => capitalize(pronouns.possessivePronoun))
      .replace(/\byours\b/g, pronouns.possessivePronoun)
      .replace(/\bYour\b/g, () => possessive(true))
      .replace(/\byour\b/g, () => possessive(false))
      .replace(/\b(in|for|to|with|without|around|before|after|from|of|at|near|inside|outside|through|toward|towards|beside|behind|within) you\b/gi, (_match, prep: string) => `${prep} ${object(false)}`)
      .replace(/\b(reward|rewards|rewarded|help|helps|helped|give|gives|gave|giving|pull|pulls|pulled|support|supports|supported|shape|shapes|shaped) you\b/gi, (_match, verb: string) => `${verb} ${object(false)}`)
      .replace(/\bYou answer\b/g, () => subjectWithVerb(true, "answer", "answers"))
      .replace(/\byou answer\b/g, () => subjectWithVerb(false, "answer", "answers"))
      .replace(/\bYou are\b/g, () => subjectWithBe(true))
      .replace(/\byou are\b/g, () => subjectWithBe(false))
      .replace(/\bYou have\b/g, () => subjectWithHave(true))
      .replace(/\byou have\b/g, () => subjectWithHave(false))
      .replace(/\bYou discover\b/g, () => subjectWithVerb(true, "discover", "discovers"))
      .replace(/\byou discover\b/g, () => subjectWithVerb(false, "discover", "discovers"))
      .replace(/\bYou learn\b/g, () => subjectWithVerb(true, "learn", "learns"))
      .replace(/\byou learn\b/g, () => subjectWithVerb(false, "learn", "learns"))
      .replace(/\bYou measure\b/g, () => subjectWithVerb(true, "measure", "measures"))
      .replace(/\byou measure\b/g, () => subjectWithVerb(false, "measure", "measures"))
      .replace(/\bYou look\b/g, () => subjectWithVerb(true, "look", "looks"))
      .replace(/\byou look\b/g, () => subjectWithVerb(false, "look", "looks"))
      .replace(/\bYou build\b/g, () => subjectWithVerb(true, "build", "builds"))
      .replace(/\byou build\b/g, () => subjectWithVerb(false, "build", "builds"))
      .replace(/\bYou stop\b/g, () => subjectWithVerb(true, "stop", "stops"))
      .replace(/\byou stop\b/g, () => subjectWithVerb(false, "stop", "stops"))
      .replace(/\bYou give\b/g, () => subjectWithVerb(true, "give", "gives"))
      .replace(/\byou give\b/g, () => subjectWithVerb(false, "give", "gives"))
      .replace(/\bYou draw\b/g, () => subjectWithVerb(true, "draw", "draws"))
      .replace(/\byou draw\b/g, () => subjectWithVerb(false, "draw", "draws"))
      .replace(/\bYou hold\b/g, () => subjectWithVerb(true, "hold", "holds"))
      .replace(/\byou hold\b/g, () => subjectWithVerb(false, "hold", "holds"))
      .replace(/\bYou earn\b/g, () => subjectWithVerb(true, "earn", "earns"))
      .replace(/\byou earn\b/g, () => subjectWithVerb(false, "earn", "earns"))
      .replace(/\bYou let\b/g, () => subjectWithVerb(true, "let", "lets"))
      .replace(/\byou let\b/g, () => subjectWithVerb(false, "let", "lets"))
      .replace(/\bYou need\b/g, () => subjectWithVerb(true, "need", "needs"))
      .replace(/\byou need\b/g, () => subjectWithVerb(false, "need", "needs"))
      .replace(/\bYou know\b/g, () => subjectWithVerb(true, "know", "knows"))
      .replace(/\byou know\b/g, () => subjectWithVerb(false, "know", "knows"))
      .replace(/\bYou commit\b/g, () => subjectWithVerb(true, "commit", "commits"))
      .replace(/\byou commit\b/g, () => subjectWithVerb(false, "commit", "commits"))
      .replace(/\bYou tend\b/g, () => subjectWithVerb(true, "tend", "tends"))
      .replace(/\byou tend\b/g, () => subjectWithVerb(false, "tend", "tends"))
      .replace(/\bYou feel\b/g, () => subjectWithVerb(true, "feel", "feels"))
      .replace(/\byou feel\b/g, () => subjectWithVerb(false, "feel", "feels"))
      .replace(/\bYou care\b/g, () => subjectWithVerb(true, "care", "cares"))
      .replace(/\byou care\b/g, () => subjectWithVerb(false, "care", "cares"))
      .replace(/\bYou want\b/g, () => subjectWithVerb(true, "want", "wants"))
      .replace(/\byou want\b/g, () => subjectWithVerb(false, "want", "wants"))
      .replace(/\bYou move\b/g, () => subjectWithVerb(true, "move", "moves"))
      .replace(/\byou move\b/g, () => subjectWithVerb(false, "move", "moves"))
      .replace(/\bYou live\b/g, () => subjectWithVerb(true, "live", "lives"))
      .replace(/\byou live\b/g, () => subjectWithVerb(false, "live", "lives"))
      .replace(/\bYou ease\b/g, () => subjectWithVerb(true, "ease", "eases"))
      .replace(/\byou ease\b/g, () => subjectWithVerb(false, "ease", "eases"))
      .replace(/\bYou protect\b/g, () => subjectWithVerb(true, "protect", "protects"))
      .replace(/\byou protect\b/g, () => subjectWithVerb(false, "protect", "protects"))
      .replace(/\bYou explain\b/g, () => subjectWithVerb(true, "explain", "explains"))
      .replace(/\byou explain\b/g, () => subjectWithVerb(false, "explain", "explains"))
      .replace(/\bYou respond\b/g, () => subjectWithVerb(true, "respond", "responds"))
      .replace(/\byou respond\b/g, () => subjectWithVerb(false, "respond", "responds"))
      .replace(/\bYou read\b/g, () => subjectWithVerb(true, "read", "reads"))
      .replace(/\byou read\b/g, () => subjectWithVerb(false, "read", "reads"))
      .replace(/\bYou show\b/g, () => subjectWithVerb(true, "show", "shows"))
      .replace(/\byou show\b/g, () => subjectWithVerb(false, "show", "shows"))
      .replace(/\bYou choose\b/g, () => subjectWithVerb(true, "choose", "chooses"))
      .replace(/\byou choose\b/g, () => subjectWithVerb(false, "choose", "chooses"))
      .replace(/\bYou make\b/g, () => subjectWithVerb(true, "make", "makes"))
      .replace(/\byou make\b/g, () => subjectWithVerb(false, "make", "makes"))
      .replace(/\bYou shine\b/g, () => subjectWithVerb(true, "shine", "shines"))
      .replace(/\byou shine\b/g, () => subjectWithVerb(false, "shine", "shines"))
      .replace(/\bYou think\b/g, () => subjectWithVerb(true, "think", "thinks"))
      .replace(/\byou think\b/g, () => subjectWithVerb(false, "think", "thinks"))
      .replace(/\bYou talk\b/g, () => subjectWithVerb(true, "talk", "talks"))
      .replace(/\byou talk\b/g, () => subjectWithVerb(false, "talk", "talks"))
      .replace(/\bYou imagine\b/g, () => subjectWithVerb(true, "imagine", "imagines"))
      .replace(/\byou imagine\b/g, () => subjectWithVerb(false, "imagine", "imagines"))
      .replace(/\bYou reach\b/g, () => subjectWithVerb(true, "reach", "reaches"))
      .replace(/\byou reach\b/g, () => subjectWithVerb(false, "reach", "reaches"))
      .replace(/\bYou carry\b/g, () => subjectWithVerb(true, "carry", "carries"))
      .replace(/\byou carry\b/g, () => subjectWithVerb(false, "carry", "carries"))
      .replace(/\bYou speak\b/g, () => subjectWithVerb(true, "speak", "speaks"))
      .replace(/\byou speak\b/g, () => subjectWithVerb(false, "speak", "speaks"))
      .replace(/\bYou reinvent\b/g, () => subjectWithVerb(true, "reinvent", "reinvents"))
      .replace(/\byou reinvent\b/g, () => subjectWithVerb(false, "reinvent", "reinvents"))
      .replace(/\bYou survive\b/g, () => subjectWithVerb(true, "survive", "survives"))
      .replace(/\byou survive\b/g, () => subjectWithVerb(false, "survive", "survives"))
      .replace(/\bYou provoke\b/g, () => subjectWithVerb(true, "provoke", "provokes"))
      .replace(/\byou provoke\b/g, () => subjectWithVerb(false, "provoke", "provokes"))
      .replace(/\bYou can\b/g, () => subjectWithModal(true, "can"))
      .replace(/\byou can\b/g, () => subjectWithModal(false, "can"))
      .replace(/\bYou will\b/g, () => subjectWithModal(true, "will"))
      .replace(/\byou will\b/g, () => subjectWithModal(false, "will"))
      .replace(/\bYou may\b/g, () => subjectWithModal(true, "may"))
      .replace(/\byou may\b/g, () => subjectWithModal(false, "may"))
      .replace(/\bYou\b/g, () => subject(true))
      .replace(/\byou\b/g, () => subject(false));

    return collapseRepeatedOwnerNameMentions(converted, ownerName, pronouns, !namedMentionUsed);
  };
}

function natalGeneratedCopyForOwner(text: string, ownerName: string, ownerKind: "person" | "chart" = "person", ownerPronouns?: PronounChoice | null) {
  return createNatalGeneratedCopyForOwnerConverter(ownerName, ownerKind, ownerPronouns)(text);
}

const chartPronouns: PersonReference = {
  subject: "it",
  object: "it",
  possessiveAdjective: "its",
  possessivePronoun: "its",
  possessive: "its",
  reflexive: "itself",
  subjectCapitalized: "It",
  objectCapitalized: "It",
  possessiveAdjectiveCapitalized: "Its",
  possessivePronounCapitalized: "Its",
  reflexiveCapitalized: "Itself",
  name: "this chart",
  namePossessive: "this chart's",
  verbAgreement: "singular",
  bePresent: "is",
  bePast: "was",
  havePresent: "has",
  verbSuffix: "s"
};

function capitalizeText(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function subjectVerb(reference: PersonReference, baseVerb: string, singularVerb: string) {
  return `${reference.subject} ${reference.verbAgreement === "plural" ? baseVerb : singularVerb}`;
}

function capitalizedSubjectVerb(reference: PersonReference, baseVerb: string, singularVerb: string) {
  return `${reference.subjectCapitalized} ${reference.verbAgreement === "plural" ? baseVerb : singularVerb}`;
}

function subjectBe(reference: PersonReference) {
  return `${reference.subject} ${reference.bePresent}`;
}

function capitalizedSubjectBe(reference: PersonReference) {
  return `${reference.subjectCapitalized} ${reference.bePresent}`;
}

function pronounSetForOwner(ownerName: string, ownerKind: "person" | "chart" = "person", pronouns?: PronounChoice | null): PersonReference {
  return ownerKind === "chart" ? chartPronouns : resolveThirdPersonReference({ name: ownerName, pronouns });
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

type RelationshipFallbackGrammarContext = {
  primaryName: string;
  comparisonName: string;
  comparisonIsSelf: boolean;
  primaryPoint?: string;
  comparisonPoint?: string;
  aspect?: string;
  romanticAllowed?: boolean;
  relationshipType?: string | null;
};

function oldSynastryMatrixTopic(topic: string) {
  const normalized = topic.trim().toLowerCase();
  const replacements: Record<string, string> = {
    "identity": relationshipPlanetTopicFallbacks.Sun,
    "feelings": relationshipPlanetTopicFallbacks.Moon,
    "needs": relationshipPlanetTopicFallbacks.Moon,
    "mind": relationshipPlanetTopicFallbacks.Mercury,
    "love and values": relationshipPlanetTopicFallbacks.Venus,
    "drive": relationshipPlanetTopicFallbacks.Mars,
    "growth": relationshipPlanetTopicFallbacks.Jupiter,
    "structure": relationshipPlanetTopicFallbacks.Saturn,
    "need for freedom": relationshipPlanetTopicFallbacks.Uranus,
    "dreams": relationshipPlanetTopicFallbacks.Neptune,
    "depth and power": relationshipPlanetTopicFallbacks.Pluto
  };

  return replacements[normalized] ?? topic.trim();
}

function oldSynastryMatrixAspectSentence(aspect: string) {
  const normalized = aspect.trim().toLowerCase();

  if (normalized.includes("conjunction")) {
    return "What matters is how the two of you use that recognition.";
  }

  if (normalized.includes("square")) {
    return "The useful move is to name the adjustment before the difference turns into a standoff.";
  }

  if (normalized.includes("opposition")) {
    return "It works better when the difference becomes information instead of a contest.";
  }

  if (normalized.includes("trine")) {
    return "That ease helps most when you still say what you need directly.";
  }

  if (normalized.includes("sextile")) {
    return "It becomes useful when you turn the opening into a concrete choice.";
  }

  return "";
}

function synastryAspectBehaviorSentence(aspect?: string) {
  const normalized = aspect?.trim().toLowerCase() ?? "";

  if (normalized === "conjunction") {
    return "The conjunction brings the two functions into the same room.";
  }

  if (normalized === "square") {
    return "The square can make the difference between your styles more noticeable.";
  }

  if (normalized === "opposition") {
    return "The opposition can make each person notice what the other one handles differently.";
  }

  if (normalized === "trine") {
    return "The trine can make this exchange feel familiar or easy to use.";
  }

  if (normalized === "sextile") {
    return "The sextile gives both of you something useful to work with, if you actually use it.";
  }

  return "This contact shows one way the two charts interact.";
}

function relationshipContextNoun(value?: string | null) {
  const normalized = normalizeRelationshipContextKey(value);
  const labels: Record<string, string> = {
    friend: "friendship",
    acquaintance: "acquaintanceship",
    "romantic-partner": "relationship",
    ex: "connection",
    situationship: "connection",
    family: "family relationship",
    coworker: "working relationship",
    business: "working relationship",
    "teacher-mentor": "mentoring relationship",
    "employer-manager": "working relationship",
    "roommate-neighbor": "home connection"
  };

  return labels[normalized] ?? "connection";
}

function relationshipContextVerb(value?: string | null) {
  const normalized = normalizeRelationshipContextKey(value);

  if (normalized === "coworker" || normalized === "business" || normalized === "employer-manager") {
    return "working relationship";
  }

  return relationshipContextNoun(value);
}

function samePlanetFallbackAspectFamily(aspect?: string | null) {
  const normalized = normalizeContentIdPart(aspect ?? "");

  if (normalized === "square" || normalized === "opposition") {
    return "challenging";
  }

  if (normalized === "trine" || normalized === "sextile") {
    return "supportive";
  }

  return normalized || "contact";
}

function samePlanetRelationshipContextLine(contextKey: string, relationshipNoun: string) {
  const contextLines: Record<string, string> = {
    friend: "In a friendship, this is less about one person teaching the other and more about a pattern both people can notice in real time.",
    "romantic-partner": "In a romantic relationship, this needs room for affection and difference at the same time.",
    "romantic-partner-ex": "With an ex, recognition can be real without becoming a reason to repeat the old pattern.",
    "family-sibling": "With siblings, the pattern can wake up comparison quickly, so it helps to separate the present moment from the old role.",
    coworker: "At work, this needs clear timing, plain expectations, and enough room for each person to move without performing for the other.",
    business: "In business, this works best when shared confidence is tied to decisions, numbers, and follow-through."
  };

  return contextLines[contextKey] ?? `In this ${relationshipNoun}, the shared planet works best when it becomes something both people can name and handle.`;
}

function samePlanetGeneralFallback(
  pairLabel: string,
  pointKey: string,
  aspectKey: string,
  aspectFamily: string,
  contextKey: string,
  relationshipNoun: string
) {
  const subjects: Record<string, string> = {
    sun: "being seen, taking up room, and deciding who gets to lead",
    moon: "comfort, mood, care, and the timing of emotional response",
    mercury: "conversation, decisions, interruptions, and the way a point gets named",
    venus: "preferences, affection, money, ease, and what feels worth maintaining",
    mars: "initiative, speed, anger, courage, and how action starts",
    jupiter: "faith, risk, appetite, promises, and how big a plan becomes",
    saturn: "standards, promises, hesitation, pressure, and what has to be carried",
    uranus: "freedom, disruption, refusal, and the need to change the rules",
    neptune: "hope, sensitivity, uncertainty, and the places where clearer edges help",
    pluto: "control, pressure, survival habits, and what nobody wants to keep pretending around"
  };
  const subject = subjects[pointKey] ?? "the same pattern";
  const contextLine = samePlanetRelationshipContextLine(contextKey, relationshipNoun);

  if (aspectKey === "conjunction") {
    return [
      `${pairLabel} may concentrate the same pattern around ${subject}.`,
      contextLine,
      "The gift is recognition: each person can understand why the other responds this way.",
      "The edge is reinforcement: the same reflex can get louder when neither person slows it down."
    ].join(" ");
  }

  if (aspectKey === "square") {
    return [
      `${pairLabel} may care about the same topic but handle it through different moves around ${subject}.`,
      contextLine,
      "The square shows up when both people are trying to solve the tension in their own style.",
      "What helps is naming the mismatch before it becomes a test of who is right."
    ].join(" ");
  }

  if (aspectKey === "opposition") {
    return [
      `${pairLabel} may stand on opposite sides of the same pattern around ${subject}.`,
      contextLine,
      "One person may reach for motion while the other asks for pause, or one may protect the part the other keeps skipping.",
      "The contact works better when each side gets a real job instead of waiting for someone to concede."
    ].join(" ");
  }

  if (aspectFamily === "supportive") {
    return [
      `${pairLabel} may find it easier to cooperate around ${subject}.`,
      contextLine,
      "Supportive does not mean automatic; it means the opening is easier to use when both people participate.",
      "Let the ease become a clear choice, not an unspoken expectation."
    ].join(" ");
  }

  if (aspectFamily === "challenging") {
    return [
      `${pairLabel} may recognize the same pattern through tension around ${subject}.`,
      contextLine,
      "The pressure is useful only if it becomes information instead of a repeat argument.",
      "Name what each person is protecting before the pattern decides for both of you."
    ].join(" ");
  }

  return [
    `${pairLabel} may recognize the same pattern around ${subject}.`,
    contextLine,
    "Use that recognition to make one ordinary choice clearer."
  ].join(" ");
}

function samePlanetSynastryFallback(context: RelationshipFallbackGrammarContext) {
  const primaryPoint = context.primaryPoint?.trim();
  const comparisonPoint = context.comparisonPoint?.trim();

  if (!primaryPoint || !comparisonPoint || normalizeContentIdPart(primaryPoint) !== normalizeContentIdPart(comparisonPoint)) {
    return "";
  }

  const pairLabel = context.comparisonIsSelf
    ? `You and ${context.primaryName}`
    : `${context.primaryName} and ${context.comparisonName}`;
  const relationshipNoun = relationshipContextNoun(context.relationshipType);
  const contextKey = normalizeRelationshipContextKey(context.relationshipType);
  const pointKey = normalizeContentIdPart(primaryPoint);
  const aspectKey = normalizeContentIdPart(context.aspect ?? "");
  const aspectFamily = samePlanetFallbackAspectFamily(context.aspect);
  const exactKey = `${contextKey}/${pointKey}/${aspectKey}`;
  const exactExamples: Record<string, string> = {
    "friend/saturn/conjunction": [
      `${pairLabel} may both take promises seriously, even when the promise is small.`,
      "That can make the friendship steady: each person understands why follow-through matters.",
      "The edge is that you can make a simple plan heavier than it needs to be, or hesitate over the same risk until nobody moves.",
      "Let the structure help the friendship breathe. Keep the agreement clear, then let it be enough."
    ].join(" "),
    "romantic-partner/venus/square": [
      `${pairLabel} may care about each other and still recognize care through different actions.`,
      "One person may want more shared time, softness, or reassurance while the other needs more space, directness, or practical proof.",
      "The square is not a lack of affection; it is the moment affection asks to be translated.",
      "Say what makes you feel chosen before resentment turns the mismatch into a scorecard."
    ].join(" "),
    "ex/venus/square": [
      `${pairLabel} may still remember what felt sweet, and also why sweetness was not enough.`,
      "The mismatch may have lived in timing, money, attention, or the way each person tried to repair discomfort.",
      "The square keeps the old preference visible without making it a reason to return.",
      "Let recognition tell the truth about the pattern, not rewrite the ending."
    ].join(" "),
    "family/mercury/square": [
      `${pairLabel} may both want to be understood, but the conversation can quickly turn into correction.`,
      "One person explains, the other counters, and suddenly the old sibling role is speaking louder than the actual point.",
      "The square asks for a pause before tone becomes the whole argument.",
      "Repeat what you heard before defending what you meant."
    ].join(" "),
    "coworker/mars/opposition": [
      `${pairLabel} may both want the work to move, but not from the same starting line.`,
      "One person may begin before the plan is settled while the other pushes back until the method is clear.",
      "The opposition can turn the task into a contest over who gets to set the pace.",
      "Name the next move and the reason for it before effort becomes resistance."
    ].join(" "),
    "business/jupiter/trine": [
      `${pairLabel} may find it easy to believe a plan can grow.`,
      "That can help the business relationship when optimism is tied to a real offer, a clear audience, and numbers both people can check.",
      "The trine opens the door, but it still needs a decision about scope.",
      "Let the bigger vision earn trust through the next practical step."
    ].join(" "),
    "friend/neptune/conjunction": [
      `${pairLabel} may share a soft spot for what could be better, kinder, or more meaningful.`,
      "In friendship, that can make space for compassion without needing every feeling explained right away.",
      "The conjunction can also blur what was promised, assumed, or left unsaid.",
      "Keep the tenderness, and put the plan in clear words when the friendship needs something concrete."
    ].join(" ")
  };

  return exactExamples[exactKey]
    ?? samePlanetGeneralFallback(pairLabel, pointKey, aspectKey, aspectFamily, contextKey, relationshipNoun);
}

function directionalSynastryFallback(context: RelationshipFallbackGrammarContext) {
  const primaryPoint = context.primaryPoint?.trim() || "";
  const comparisonPoint = context.comparisonPoint?.trim() || "";
  const aspect = context.aspect?.trim().toLowerCase() || "";
  const primaryKey = normalizeContentIdPart(primaryPoint);
  const comparisonKey = normalizeContentIdPart(comparisonPoint);
  const comparisonObject = context.comparisonIsSelf ? "you" : context.comparisonName;
  const comparisonPossessive = context.comparisonIsSelf ? "your" : possessiveLabel(context.comparisonName);
  const relationshipNoun = relationshipContextVerb(context.relationshipType);

  if (primaryKey === "saturn" && comparisonKey === "ascendant") {
    return [
      `${context.primaryName} may make ${comparisonObject} more aware of how ${context.comparisonIsSelf ? "you come" : `${context.comparisonName} comes`} across, especially when a choice gets questioned or the pace slows down.`,
      `${possessiveLabel(context.primaryName)} caution can help with preparation, but it may also feel like judgment before there has been room to find a footing.`,
      `The ${relationshipNoun} works better when advice is requested rather than automatically imposed.`
    ].join(" ");
  }

  if (primaryKey === "mars" && comparisonKey === "midheaven") {
    return [
      `${context.primaryName} can push ${comparisonObject} to act on ambitions that might otherwise get postponed.`,
      `${possessiveLabel(context.primaryName)} initiative may help a public goal feel more urgent, although it can also feel like pressure when the pace needs to stay self-directed.`,
      "Let encouragement create momentum without giving someone else control of the direction."
    ].join(" ");
  }

  if (primaryKey === "sun" && comparisonKey === "mars") {
    return [
      `${possessiveLabel(context.primaryName)} confidence can make it easier for ${comparisonObject} to act on instinct.`,
      `Around ${context.primaryName}, ${context.comparisonIsSelf ? "you may" : `${context.comparisonName} may`} take initiative faster, speak up sooner, or become more competitive than usual.`,
      `This can make the ${relationshipNoun} energizing, but it helps to notice when encouragement turns into escalation.`
    ].join(" ");
  }

  if (primaryKey === "venus" && comparisonKey === "mars") {
    if (context.romanticAllowed) {
      return [
        `${context.primaryName} may bring preference, warmth, and attraction into contact with ${comparisonPossessive} drive.`,
        "That can create obvious interest, but wanting the same moment does not automatically mean wanting the same relationship.",
        "Let the spark introduce the pattern, then check whether timing, respect, and follow-through are also there."
      ].join(" ");
    }

    return [
      `${context.primaryName} may prefer tact, comfort, or consensus where ${comparisonObject} wants a quicker response.`,
      "That difference can improve things when diplomacy and action are both needed.",
      "It can also create frustration about tone and timing.",
      "Agree on who handles the conversation and who handles the immediate action."
    ].join(" ");
  }

  if (primaryKey === "neptune" && comparisonKey === "mercury") {
    return [
      `${context.primaryName} may hear possibility in an idea while ${comparisonObject} is trying to establish exactly what was said.`,
      "That can make conversations imaginative, but it can also leave important assumptions unstated.",
      "Put plans in clear language when the details matter."
    ].join(" ");
  }

  if (primaryKey === "pluto" && comparisonKey === "mars") {
    return [
      `${context.primaryName} may intensify ${comparisonPossessive} determination, especially when a shared goal or disagreement matters to both of you.`,
      "That pressure can help with follow-through, but it can also make compromise feel like defeat.",
      "Decide what outcome you want before the conflict becomes a contest of endurance."
    ].join(" ");
  }

  const aspectMove = aspect === "square"
    ? "The difference needs an adjustment before it turns into friction."
    : aspect === "opposition"
      ? "The difference works better when each person names their side without making the other person carry it."
      : aspect === "trine"
        ? "The ease helps most when neither person assumes the other already knows what is needed."
        : aspect === "sextile"
          ? "Start with what is observable, then choose one clear response together."
          : "The contact works best when both people notice what it brings up and choose how to use it.";

  return [
    `${possessiveLabel(context.primaryName)} ${primaryPoint} brings ${primaryPoint.toLowerCase()} material into contact with ${comparisonPossessive} ${comparisonPoint.toLowerCase()} in the ${relationshipNoun}.`,
    aspectMove
  ].join(" ");
}

function relationshipAwareSynastryFallback(context: RelationshipFallbackGrammarContext) {
  const primaryPoint = context.primaryPoint?.trim();
  const comparisonPoint = context.comparisonPoint?.trim();
  const aspect = context.aspect?.trim();

  if (!primaryPoint || !comparisonPoint || !aspect) {
    return "";
  }

  const normalizedAspect = normalizeFallbackV3Aspect(aspect);
  if (!normalizedAspect) {
    return "";
  }

  try {
    const rendered = transitSynastryFallbackRendererV3.renderSynastryAspect({
      planetA: normalizeContentIdPart(primaryPoint),
      planetB: normalizeContentIdPart(comparisonPoint),
      aspect: normalizedAspect,
      otherName: context.comparisonIsSelf ? "you" : context.comparisonName
    });

    return readerFacingParagraphs(rendered.parts).join(" ");
  } catch (error) {
    if (error instanceof FallbackV3SourceGapError) {
      return "";
    }

    throw error;
  }
}

function oldSynastryMatrixReplacementSentence(
  topicA: string,
  topicB: string,
  aspectSentence: string,
  context: RelationshipFallbackGrammarContext
) {
  const primaryPossessive = possessiveLabel(context.primaryName);
  const comparisonPossessive = context.comparisonIsSelf ? "your" : possessiveLabel(context.comparisonName);
  const primaryPoint = context.primaryPoint?.trim();
  const comparisonPoint = context.comparisonPoint?.trim();

  if (primaryPoint && comparisonPoint) {
    void primaryPossessive;
    void comparisonPossessive;
    void topicA;
    void topicB;
    void aspectSentence;
    return relationshipAwareSynastryFallback(context);
  }

  return relationshipAwareSynastryFallback(context);
}

function nonRomanticSynastryFallback(text: string, context?: RelationshipFallbackGrammarContext) {
  if (!context || context.romanticAllowed) {
    return text;
  }

  if (!/\b(attraction|attracted|chemistry|desire|desired|physical ease|physical pull|sexual|sexy|romance|romantic|dating|spark|heat|wanting someone|wants each other|wanted and pursued)\b/i.test(text)) {
    return text;
  }

  const primaryPossessive = possessiveLabel(context.primaryName);
  const comparisonPossessive = context.comparisonIsSelf ? "your" : possessiveLabel(context.comparisonName);
  const primaryPoint = context.primaryPoint?.trim() || "planet";
  const comparisonPoint = context.comparisonPoint?.trim() || "planet";

  void primaryPossessive;
  void comparisonPossessive;
  void primaryPoint;
  void comparisonPoint;
  return relationshipAwareSynastryFallback(context);
}

function repairOldSynastryMatrixCopy(text: string, context?: RelationshipFallbackGrammarContext) {
  if (!context) {
    return text;
  }

  return text.replace(
    /\bA's ([^.]+?) meets B's ([^.]+?)\. The ([^.]+?)\./gi,
    (_match, rawTopicA: string, rawTopicB: string, rawAspectSentence: string) => {
      const topicA = oldSynastryMatrixTopic(rawTopicA);
      const topicB = oldSynastryMatrixTopic(rawTopicB);
      const aspectSentence = oldSynastryMatrixAspectSentence(rawAspectSentence);

      return oldSynastryMatrixReplacementSentence(topicA, topicB, aspectSentence, context);
    }
  );
}

function repairRelationshipFallbackGrammar(text: string, context?: RelationshipFallbackGrammarContext) {
  const repairedText = Object.entries({
    "how a person thinks, learns, communicates, decides, and exchanges information": relationshipPlanetTopicFallbacks.Mercury,
    "how a person thinks, learns, communicates, and makes decisions": relationshipPlanetTopicFallbacks.Mercury,
    "how a person connects, attracts, chooses, values, and receives pleasure": relationshipPlanetTopicFallbacks.Venus,
    "how a person acts, wants, pursues, initiates, and handles friction": relationshipPlanetTopicFallbacks.Mars,
    "how a person grows, believes, trusts, seeks meaning, and opens to possibility": relationshipPlanetTopicFallbacks.Jupiter,
    "how a person handles limits, time, pressure, commitment, and responsibility": relationshipPlanetTopicFallbacks.Saturn,
    "how a person changes, breaks patterns, seeks freedom, and handles disruption": relationshipPlanetTopicFallbacks.Uranus,
    "how a person imagines, dissolves, idealizes, senses, and escapes": relationshipPlanetTopicFallbacks.Neptune,
    "how a person handles power, control, endings, intensity, and deep pressure": relationshipPlanetTopicFallbacks.Pluto,
    "where a person feels tender, exposed, or ready for repair": relationshipPlanetTopicFallbacks.Chiron,
    "where a person is being pulled toward growth, appetite, and new direction": relationshipPlanetTopicFallbacks["North Node"],
    "what a person needs, remembers, protects, and reacts from": relationshipPlanetTopicFallbacks.Moon,
    "what a person is becoming, expressing, centering, and radiating": relationshipPlanetTopicFallbacks.Sun,
    "how a person enters a room, meets life, and is first perceived": relationshipPlanetTopicFallbacks.Ascendant,
    "where a person is visible, directed, and publicly oriented": relationshipPlanetTopicFallbacks.Midheaven
  }).reduce((currentText, [fragment, replacement]) => (
    currentText.replace(new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), replacement)
  ), text);

  return nonRomanticSynastryFallback(repairOldSynastryMatrixCopy(repairedText, context), context)
    .replace(/\b(A|B)'s ([^.!?]{0,80}\band\b[^.!?]{0,80}) meets\b/g, "$1's $2 meet")
    .replace(/\b(A|B)'s (dreams|feelings|needs|drives|values|ideas|beliefs|limits|patterns|wounds|sensitivities) meets\b/gi, "$1's $2 meet")
    .replace(/\bdescribes how how\b/gi, "describes how")
    .replace(/\bOne person's how a person\b/gi, "One person's")
    .replace(/\bthe other person's how a person\b/gi, "the other person's")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function synastryContactSummary(
  friendName: string,
  comparisonName: string,
  comparisonIsSelf: boolean,
  contact: Omit<SynastryContact, "summary">,
  generatedContent?: GeneratedContentMap,
  friendPronouns?: PronounChoice | null,
  comparisonPronouns?: PronounChoice | null,
  romanticAllowed = false,
  relationshipType?: string | null
) {
  const normalized = normalizeSynastryContactSurface(
    friendName,
    comparisonName,
    comparisonIsSelf,
    contact,
    generatedContent,
    friendPronouns,
    comparisonPronouns,
    romanticAllowed,
    relationshipType
  );

  return normalized.sections[0]?.body ? textPreview(normalized.sections[0].body) : "";
}

function synastryContacts(
  profileNatalSky: SkySnapshot | null,
  chart: ManualChart,
  generatedContent?: GeneratedContentMap,
  comparisonName = "You",
  comparisonIsSelf = true,
  comparisonPronouns?: PronounChoice | null,
  romanticAllowed = false,
  relationshipType?: string | null
): SynastryContact[] {
  const friendPoints = comparisonPointsFromSky(chart.natalChart ?? null);
  const yourPoints = comparisonPointsFromSky(profileNatalSky);

  const contacts = friendPoints
    .flatMap((friendPoint) => yourPoints.flatMap((yourPoint) => {
      const separation = angularDistance(friendPoint.longitude, yourPoint.longitude);
      const aspect = transitAspectDefinitions
        .map((definition) => ({ ...definition, orbValue: Math.abs(separation - definition.exact) }))
        .filter((definition) => definition.orbValue <= synastryAspectOrbLimit(definition.type, friendPoint.name, yourPoint.name))
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
        contentKeys: synastryContactContentKeys(friendPoint.name, aspect.type, yourPoint.name, relationshipType)
      };

      return [{
        ...baseContact,
        summary: synastryContactSummary(
          chart.displayName,
          comparisonName,
          comparisonIsSelf,
          baseContact,
          generatedContent,
          chart.pronouns,
          comparisonPronouns,
          romanticAllowed,
          relationshipType
        )
      }];
    }));
  const orderedContacts = contacts.sort((first, second) => second.score - first.score || first.orb - second.orb);
  const primaryContacts = orderedContacts.filter((contact) => synastryContactSignalTier(contact.friendPoint.name, contact.yourPoint.name) === "primary");
  const secondaryContacts = orderedContacts.filter((contact) => synastryContactSignalTier(contact.friendPoint.name, contact.yourPoint.name) === "secondary");
  const backgroundContacts = orderedContacts.filter((contact) => synastryContactSignalTier(contact.friendPoint.name, contact.yourPoint.name) === "background");

  return [...primaryContacts, ...secondaryContacts, ...backgroundContacts].slice(0, 16);
}

const compatibilityPlanets = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"] as const;

type CompatibilityWriteupBankEntry = {
  glyph: string;
  match: string;
  body?: string;
  function: string;
  your_line: string;
  their_line: string;
  same_sign: boolean;
  same_sign_line: string;
  same_sign_quote: { text: string; source: string } | null;
  verdict: string;
  relationship: string;
  tier?: string;
  status?: string;
};

type CompatibilityWriteupBank = {
  cards: Record<string, Record<string, Record<string, CompatibilityWriteupBankEntry>>>;
};

type RenderedCompatibilityLibraryRecord = {
  relation: string;
  source: string;
  text: string;
  format: "multi-paragraph";
  domain: string;
  tag: string;
} & Record<string, string>;

type RenderedCompatibilityLibrary = RenderedCompatibilityLibraryRecord[];

type CompatibilitySummaryBankEntry = {
  function: string;
  nouns: string;
  shared: string;
  different: string;
  watch: string;
  try: string;
  relationship: string;
  tier?: string;
  status?: string;
};

type CompatibilitySummaryBank = {
  cards: Record<string, Record<string, Record<string, CompatibilitySummaryBankEntry>>>;
};

const compatibilityWriteupsByPlanet = (compatibilityWriteupBank as CompatibilityWriteupBank).cards;
const compatibilitySummariesByPlanet = (compatibilitySummaryBank as CompatibilitySummaryBank).cards;
const compatibilityRenderedLibraryManifest: Partial<Record<typeof compatibilityPlanets[number], RenderedCompatibilityLibrary>> = {
  Moon: moonCompatibilityLibrary as RenderedCompatibilityLibrary
};

function compatibilityRelationChipLabel(relation: string | null | undefined, seedLabel?: string | null) {
  return seedLabel?.trim() || titleCase(normalizeContentIdPart(relation ?? "compatibility").replace(/-/g, " "));
}

function renderedCompatibilityRecordSign(
  record: RenderedCompatibilityLibraryRecord,
  planet: typeof compatibilityPlanets[number],
  role: "reader" | "other"
) {
  return normalizeContentIdPart(record[`${role}_${normalizeContentIdPart(planet)}`]);
}

function renderedCompatibilityLibraryEntry(
  planet: typeof compatibilityPlanets[number],
  comparisonSign: string,
  friendSign: string
): CompatibilityWriteupBankEntry | null {
  const library = compatibilityRenderedLibraryManifest[planet];

  if (!library) {
    return null;
  }

  const comparisonKey = normalizeContentIdPart(comparisonSign);
  const friendKey = normalizeContentIdPart(friendSign);
  const record = library.find((entry) => (
    renderedCompatibilityRecordSign(entry, planet, "reader") === comparisonKey
    && renderedCompatibilityRecordSign(entry, planet, "other") === friendKey
  ));

  if (!record || record.format !== "multi-paragraph") {
    return null;
  }

  const body = record.text.trim();
  const paragraphs = body.split(/\n\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);

  if (paragraphs.length !== 4) {
    return null;
  }

  const sameSign = comparisonKey === friendKey;

  return {
    glyph: pointGlyph(planet),
    match: compatibilityRelationChipLabel(record.relation, record.tag),
    body,
    function: paragraphs[0],
    your_line: paragraphs[1],
    their_line: sameSign ? "" : paragraphs[2],
    same_sign: sameSign,
    same_sign_line: sameSign ? paragraphs[2] : "",
    same_sign_quote: null,
    verdict: paragraphs[3],
    relationship: record.relation,
    tier: "author-final",
    status: "LIVE"
  };
}

function compatibilityWriteupEntry(
  planet: typeof compatibilityPlanets[number],
  comparisonSign: string,
  friendSign: string
) {
  return renderedCompatibilityLibraryEntry(planet, comparisonSign, friendSign)
    ?? compatibilityWriteupsByPlanet[normalizeContentIdPart(planet)]
    ?.[normalizeContentIdPart(comparisonSign)]
    ?.[normalizeContentIdPart(friendSign)] ?? null;
}

function compatibilityDashboardContentKey(
  planet: typeof compatibilityPlanets[number],
  comparisonSign: string,
  friendSign: string
) {
  return `compatibility.${normalizeContentIdPart(planet)}.${normalizeContentIdPart(comparisonSign)}.${normalizeContentIdPart(friendSign)}`;
}

function compatibilityDashboardWriteupEntry(
  generatedContent: GeneratedContentMap | undefined,
  planet: typeof compatibilityPlanets[number],
  comparisonSign: string,
  friendSign: string,
  phrasebankWriteup: CompatibilityWriteupBankEntry | null
): CompatibilityWriteupBankEntry | null {
  if (!generatedContent) {
    return null;
  }

  const contentKey = compatibilityDashboardContentKey(planet, comparisonSign, friendSign);
  const dashboardContent = generatedContent.get(contentKey);

  if (!dashboardContent) {
    return null;
  }

  const dashboardParagraphs = generatedContentParagraphs(dashboardContent);
  const paragraphs = dashboardParagraphs.length >= 4
    ? dashboardParagraphs
    : generatedContentSections(dashboardContent).map((section) => section.body);

  if (paragraphs.length < 4) {
    return null;
  }

  const comparisonKey = normalizeContentIdPart(comparisonSign);
  const friendKey = normalizeContentIdPart(friendSign);
  const sameSign = phrasebankWriteup?.same_sign ?? comparisonKey === friendKey;
  const fallbackWriteup: CompatibilityWriteupBankEntry = phrasebankWriteup ?? {
    glyph: pointGlyph(planet),
    match: compatibilityRelationChipLabel(
      String(dashboardContent.sourceSnapshot?.relationship ?? "compatibility"),
      String(dashboardContent.sourceSnapshot?.relationTagSeed ?? "")
    ),
    function: "",
    your_line: "",
    their_line: "",
    same_sign: sameSign,
    same_sign_line: "",
    same_sign_quote: null,
    verdict: "",
    relationship: "compatibility"
  };

  return {
    ...fallbackWriteup,
    body: (dashboardContent.body ?? "")
      .trim()
      .split(/\n\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .join("\n\n"),
    function: paragraphs[0],
    your_line: paragraphs[1],
    their_line: sameSign ? "" : paragraphs[2],
    same_sign: sameSign,
    same_sign_line: sameSign ? paragraphs[2] : "",
    verdict: paragraphs[3],
    tier: String(dashboardContent.sourceSnapshot?.tier ?? fallbackWriteup.tier ?? "dashboard-article"),
    status: "LIVE"
  };
}

function compatibilitySummaryEntry(
  planet: typeof compatibilityPlanets[number],
  comparisonSign: string,
  friendSign: string
) {
  return compatibilitySummariesByPlanet[normalizeContentIdPart(planet)]
    ?.[normalizeContentIdPart(comparisonSign)]
    ?.[normalizeContentIdPart(friendSign)] ?? null;
}

function normalizeCompatibilityCardSurface({
  comparisonSign,
  friendSign,
  planet,
  writeup
}: {
  comparisonSign: string;
  friendSign: string;
  planet: typeof compatibilityPlanets[number];
  writeup: CompatibilityWriteupBankEntry | null;
}): NormalizedCompatibilityCardArticle {
  if (!writeup) {
    return {
      surface: "compatibility-card",
      status: "not-servable",
      sections: []
    };
  }

  const sourceKeys = [
    "cc-compatibility-writeups",
    `compatibility.${normalizeContentIdPart(planet)}.${normalizeContentIdPart(comparisonSign)}.${normalizeContentIdPart(friendSign)}`
  ];
  const base = {
    required: true,
    layer: "authored" as const,
    tier: writeup.tier ?? "DRAFT",
    sourceKeys
  };
  const candidates: Array<NormalizedCompatibilityCardSection | null> = [
    writeup.function ? {
      ...base,
      slot: "function",
      heading: `${planet} function`,
      body: writeup.function
    } : null,
    writeup.your_line ? {
      ...base,
      slot: "your-line",
      heading: `${planet} for you`,
      body: writeup.your_line
    } : null,
    !writeup.same_sign && writeup.their_line ? {
      ...base,
      slot: "their-line",
      heading: `${planet} for them`,
      body: writeup.their_line
    } : null,
    writeup.same_sign && writeup.same_sign_line ? {
      ...base,
      slot: "same-sign-line",
      heading: `${planet} shared pattern`,
      body: writeup.same_sign_line
    } : null,
    writeup.verdict ? {
      ...base,
      slot: "verdict",
      heading: `${planet} verdict`,
      body: writeup.verdict
    } : null
  ];
  const sections = candidates.filter((section): section is NormalizedCompatibilityCardSection => (
    Boolean(section?.body && isReaderFacingCopy(section.body))
  ));
  const requiredSlots: CompatibilityCardSlot[] = writeup.same_sign
    ? ["function", "your-line", "same-sign-line", "verdict"]
    : ["function", "your-line", "their-line", "verdict"];
  const filledSlots = new Set(sections.map((section) => section.slot));
  const hasAllRequired = requiredSlots.every((slot) => filledSlots.has(slot));

  return {
    surface: "compatibility-card",
    status: hasAllRequired ? "servable" : sections.length > 0 ? "partial" : "not-servable",
    sections
  };
}

function samePlanetExactAspect(personAPosition: PlanetPosition, personBPosition: PlanetPosition) {
  const separation = angularDistance(zodiacLongitude(personAPosition), zodiacLongitude(personBPosition));

  return transitAspectDefinitions
    .map((definition) => ({ ...definition, orbValue: Math.abs(separation - definition.exact) }))
    .filter((definition) => definition.orbValue <= synastryAspectOrbLimit(definition.type, personBPosition.planet, personAPosition.planet))
    .sort((first, second) => first.orbValue - second.orbValue)[0] ?? null;
}

function compatibilityPlanetCards(
  profileNatalSky: SkySnapshot | null,
  chart: ManualChart,
  generatedContent?: GeneratedContentMap,
  relationshipType?: string | null,
  comparisonName = "You",
  comparisonIsSelf = true
): CompatibilityPlanetCard[] {
  const friendSky = chart.natalChart;

  if (!profileNatalSky || !friendSky) {
    return [];
  }

  return compatibilityPlanets.flatMap((planet) => {
    const yourPosition = profileNatalSky.positions.find((position) => position.planet === planet);
    const friendPosition = friendSky.positions.find((position) => position.planet === planet);

    if (!yourPosition || !friendPosition) {
      return [];
    }

    const exactAspect = samePlanetExactAspect(yourPosition, friendPosition);
    const hasExactAspect = Boolean(exactAspect);
    const comparisonLabel = comparisonIsSelf ? "You" : comparisonName;
    const comparisonPossessive = relationshipComparisonPossessive(comparisonName, comparisonIsSelf);
    const writeup = compatibilityWriteupEntry(
      planet,
      yourPosition.sign,
      friendPosition.sign
    );
    const dashboardWriteup = compatibilityDashboardWriteupEntry(
      generatedContent,
      planet,
      yourPosition.sign,
      friendPosition.sign,
      writeup
    );
    const resolvedWriteup = dashboardWriteup ?? writeup;
    const summary = compatibilitySummaryEntry(
      planet,
      yourPosition.sign,
      friendPosition.sign
    );
    const normalized = normalizeCompatibilityCardSurface({
      comparisonSign: yourPosition.sign,
      friendSign: friendPosition.sign,
      planet,
      writeup: resolvedWriteup
    });

    if (!resolvedWriteup || normalized.status === "not-servable") {
      return [];
    }

    const sectionBySlot = new Map(normalized.sections.map((section) => [section.slot, taggedSectionBody(section)]));

    return [{
      id: `compatibility-${normalizeContentIdPart(planet)}`,
      glyph: yourPosition.glyph || pointGlyph(planet),
      planet,
      comparisonLabel,
      youSign: yourPosition.sign,
      friendName: chart.displayName,
      friendSign: friendPosition.sign,
      goDeeper: {
        glyph: resolvedWriteup.glyph,
        match: resolvedWriteup.match,
        body: resolvedWriteup.body,
        function: sectionBySlot.get("function") ?? "",
        yourLine: sectionBySlot.get("your-line") ?? "",
        theirLine: sectionBySlot.get("their-line") ?? "",
        sameSign: resolvedWriteup.same_sign,
        sameSignLine: sectionBySlot.get("same-sign-line") ?? "",
        verdict: sectionBySlot.get("verdict") ?? "",
        relationship: resolvedWriteup.relationship,
        contentTrace: `tier=${resolvedWriteup.tier ?? "unknown"};status=${resolvedWriteup.status ?? "unknown"};source=${dashboardWriteup ? "dashboard-generated-content" : "cc-compatibility-writeups"};route=friends.compatibility;planet=${normalizeContentIdPart(planet)};relationship=${resolvedWriteup.relationship};context=${normalizeRelationshipContextKey(relationshipType)}`
      },
      summary: summary ? {
        function: summary.function,
        nouns: summary.nouns,
        shared: summary.shared,
        different: summary.different,
        watch: summary.watch,
        try: summary.try,
        relationship: summary.relationship,
        contentTrace: `tier=${summary.tier ?? "unknown"};status=${summary.status ?? "unknown"};source=cc-compatibility-cards;route=friends.compatibility.summary;planet=${normalizeContentIdPart(planet)};relationship=${summary.relationship};context=${normalizeRelationshipContextKey(relationshipType)}`
      } : undefined,
      exactAspectLabel: hasExactAspect && exactAspect
        ? `${comparisonPossessive} ${planet} ${exactAspect.type} their ${planet} · orb ${wholeDegreeOrb(exactAspect.orbValue)}`
        : undefined,
      contentTrace: `tier=${resolvedWriteup.tier ?? "unknown"};status=${resolvedWriteup.status ?? "unknown"};source=${dashboardWriteup ? "dashboard-generated-content" : "cc-compatibility-writeups"};route=friends.compatibility;planet=${normalizeContentIdPart(planet)};relationship=${resolvedWriteup.relationship};context=${normalizeRelationshipContextKey(relationshipType)}`
    }];
  });
}

function compatibilityDynamicHeading(aspect: string): CompatibilityDynamic["heading"] {
  if (aspect === "trine" || aspect === "sextile") {
    return "What flows";
  }

  if (aspect === "square" || aspect === "opposition") {
    return "Challenges";
  }

  return "Mixed or charged dynamics";
}

function compatibilityDynamicsFromContacts(
  contacts: SynastryContact[],
  friendName: string,
  comparisonName: string,
  comparisonIsSelf: boolean,
  friendPronouns?: PronounChoice | null,
  comparisonPronouns?: PronounChoice | null
): CompatibilityDynamic[] {
  return contacts.map((contact) => ({
    id: `compatibility-dynamic-${contact.id}`,
    heading: compatibilityDynamicHeading(contact.aspect),
    glyphs: `${contact.friendPoint.glyph} ${aspectGlyph(contact.aspect)} ${contact.yourPoint.glyph}`,
    title: relationshipAspectTitleFromSlots(synastryTemplateSlots(
      friendName,
      contact.friendPoint.name,
      contact.aspect,
      comparisonName,
      contact.yourPoint.name,
      "friend",
      {
        personAPronouns: friendPronouns,
        personBPronouns: comparisonPronouns,
        personBIsReader: comparisonIsSelf
      }
    )),
    summary: contact.summary,
    meta: wholeDegreeOrb(contact.orb)
  }));
}

function synastryDetailCopy(
  friendName: string,
  comparisonName: string,
  comparisonIsSelf: boolean,
  contact: SynastryContact,
  generatedContent?: GeneratedContentMap,
  friendPronouns?: PronounChoice | null,
  comparisonPronouns?: PronounChoice | null,
  romanticAllowed = false,
  relationshipType?: string | null
) {
  const normalized = normalizeSynastryContactSurface(
    friendName,
    comparisonName,
    comparisonIsSelf,
    contact,
    generatedContent,
    friendPronouns,
    comparisonPronouns,
    romanticAllowed,
    relationshipType
  );

  return normalized.sections.map((section) => taggedSectionBody(section));
}

function synastryHouseOverlays(profileNatalSky: SkySnapshot | null, chart: ManualChart, generatedContent?: GeneratedContentMap): HouseOverlay[] {
  void generatedContent;
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
      const heading = `${ownerLabel} ${position.planet} in ${houseOwner} ${ordinalHouse(house)} house`;
      const normalized = normalizeHouseOverlaySurface({
        contentKeys,
        direction,
        heading,
        house,
        planet: position.planet
      });
      const detailParagraphs = normalized.sections.flatMap((section) => taggedSectionParagraphs(section));
      const summary = textPreview(detailParagraphs[0] ?? direction);

      return [{
        id: `${ownerName}-${position.planet}-${targetName}-${house}`.toLowerCase().replace(/\s+/g, "-"),
        planet: position.planet,
        glyph: position.glyph,
        ownerName,
        targetName,
        house,
        summary,
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
  return value === "event" ? "Event" : relationshipContextLabel(value);
}

type PhrasebankCompositeRelationshipType =
  | "romantic"
  | "friendship"
  | "family"
  | "coworkers"
  | "creative"
  | "exes"
  | "complicated";

function phrasebankCompositeRelationshipType(value?: string | null): PhrasebankCompositeRelationshipType {
  const normalized = normalizeRelationshipContextKey(value);
  const phrasebankMap: Record<ReturnType<typeof normalizeRelationshipContextKey>, PhrasebankCompositeRelationshipType> = {
    friend: "friendship",
    acquaintance: "friendship",
    "romantic-partner": "romantic",
    ex: "exes",
    situationship: "complicated",
    family: "family",
    coworker: "coworkers",
    business: "coworkers",
    "teacher-mentor": "coworkers",
    "employer-manager": "coworkers",
    "roommate-neighbor": "friendship"
  };

  return phrasebankMap[normalized] ?? "friendship";
}

function compositeRelationshipTypeSection(
  generated: LiveGeneratedContent | null,
  relationshipType?: string | null
) {
  const sections = generated?.sections;

  if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
    return null;
  }

  const byRelationshipType = (sections as Record<string, unknown>).byRelationshipType;

  if (!byRelationshipType || typeof byRelationshipType !== "object" || Array.isArray(byRelationshipType)) {
    return null;
  }

  const typeKey = phrasebankCompositeRelationshipType(relationshipType);
  const safeTypeKey = typeKey === "romantic" && !isExplicitRomanticRelationship(relationshipType)
    ? "friendship"
    : typeKey;
  const variant = (byRelationshipType as Record<string, unknown>)[safeTypeKey];

  if (!variant || typeof variant !== "object" || Array.isArray(variant)) {
    return null;
  }

  return variant as Record<string, unknown>;
}

function compositeRelationshipTypeParagraphs(
  generated: LiveGeneratedContent | null,
  relationshipType?: string | null
) {
  const variant = compositeRelationshipTypeSection(generated, relationshipType);

  if (!variant) {
    return [];
  }

  return readerFacingParagraphs([
    typeof variant.experience === "string" ? variant.experience : "",
    typeof variant.advice === "string" ? variant.advice : "",
    typeof variant.astro === "string" ? `The astro: ${variant.astro}.` : ""
  ]);
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

function compositeAspectFallbackSummary(aspect: { from: string; to: string; type: string; orb?: number | null }) {
  const aspectType = normalizeAspectType(aspect.type);
  const firstTopic = relationshipPlanetTopicSlot(aspect.from, "friend");
  const secondTopic = relationshipPlanetTopicSlot(aspect.to, "friend");
  const aspectSentence: Record<string, string> = {
    conjunction: "These themes merge into one strong shared pattern, so the relationship tends to experience them as a single combined force.",
    opposition: "These themes sit across from each other in the relationship, creating a polarity that can become clearer when both sides are named plainly.",
    square: "These themes press against each other in the relationship, creating friction that can become useful when it is handled directly.",
    trine: "These themes move easily together in the relationship, giving the bond a natural channel of support and recognition.",
    sextile: "These themes cooperate in the relationship, giving the bond a practical opening for shared effort and mutual understanding."
  };

  return `The composite ${aspect.from} ${aspectType} ${aspect.to} changes how the relationship handles ${firstTopic} when ${secondTopic} enters the same moment. ${aspectSentence[aspectType] ?? "The contact describes a recurring relationship pattern that becomes clearer when both people can see what each planet is doing in the bond."}`;
}

function compositePlacementFallbackSummary(position: { planet: string; sign: string; house?: number | null }) {
  const planetTopic = relationshipPlanetTopicSlot(position.planet, "friend");
  const signStyle = signStyleSlot(position.sign);
  const houseCopy = position.house
    ? `In the ${ordinalHouse(position.house)} house, that pattern is most visible through ${houseLifeAreas[position.house] ?? readableHouseTopic(position.house)}.`
    : "Without a confirmed house, the sign still gives the clearest read on the relationship's shared tone and recurring expression.";

  return `${position.planet} in ${position.sign} gives the relationship a ${signStyle} style around ${planetTopic}. ${houseCopy}`;
}

function sourceGroundedCompositeSection({
  contentKeys,
  heading
}: {
  contentKeys: string[];
  heading: string;
}): NormalizedCompositeSection | null {
  const fallback = relationshipKnowledgeFallbackByKeys(contentKeys);
  const body = contentFallbackParagraphs(fallback).join("\n\n");

  if (!body) {
    return null;
  }

  return {
    slot: "composite-meaning",
    required: true,
    layer: "fallback",
    tier: "relationship-knowledge",
    sourceKeys: contentKeys,
    heading,
    body
  };
}

function compositeAspectMadlibSection(aspect: { from: string; to: string; type: string; orb?: number | null }): NormalizedCompositeSection | null {
  const body = compositeAspectFallbackSummary(aspect);

  if (!isReaderFacingCopy(body)) {
    return null;
  }

  return {
    slot: "composite-meaning",
    required: true,
    layer: "fallback",
    tier: "source-based-madlib",
    sourceKeys: [
      `relationshipPlanetTopic.${normalizeContentIdPart(aspect.from)}`,
      `relationshipAspect.${normalizeContentIdPart(aspect.type)}`,
      `relationshipPlanetTopic.${normalizeContentIdPart(aspect.to)}`
    ],
    heading: `Composite ${aspect.from} ${titleCase(aspect.type)} ${aspect.to}`,
    body
  };
}

function compositePlacementMadlibSection(position: { planet: string; sign: string; house?: number | null }): NormalizedCompositeSection | null {
  const body = compositePlacementFallbackSummary(position);

  if (!isReaderFacingCopy(body)) {
    return null;
  }

  return {
    slot: "composite-meaning",
    required: true,
    layer: "fallback",
    tier: "source-based-madlib",
    sourceKeys: [
      `relationshipPlanetTopic.${normalizeContentIdPart(position.planet)}`,
      `signStyle.${normalizeContentIdPart(position.sign)}`,
      ...(position.house ? [`houseLifeAreas.${position.house}`] : [])
    ],
    heading: `Composite ${position.planet} in ${position.sign}`,
    body
  };
}

function normalizeCompositeAspectSurface(aspect: { from: string; to: string; type: string; orb?: number | null }): NormalizedCompositeArticle {
  const contentKeys = relationshipAspectContentKeys(aspect.from, aspect.type, aspect.to, "composite");
  const sourceGroundedSection = sourceGroundedCompositeSection({
    contentKeys,
    heading: `Composite ${aspect.from} ${titleCase(aspect.type)} ${aspect.to}`
  });
  const fallbackSection = sourceGroundedSection ? null : compositeAspectMadlibSection(aspect);
  const sections = sourceGroundedSection ? [sourceGroundedSection] : fallbackSection ? [fallbackSection] : [];

  return {
    surface: "composite",
    status: sourceGroundedSection ? "servable" : fallbackSection ? "partial" : "not-servable",
    sections
  };
}

function normalizeCompositePlacementSurface(position: { planet: string; sign: string; house?: number | null }): NormalizedCompositeArticle {
  const contentKeys = compositePlacementContentKeys(position.planet, position.sign, position.house);
  const sourceGroundedSection = sourceGroundedCompositeSection({
    contentKeys,
    heading: `Composite ${position.planet} in ${position.sign}`
  });
  const fallbackSection = sourceGroundedSection ? null : compositePlacementMadlibSection(position);
  const sections = sourceGroundedSection ? [sourceGroundedSection] : fallbackSection ? [fallbackSection] : [];

  return {
    surface: "composite",
    status: sourceGroundedSection ? "servable" : fallbackSection ? "partial" : "not-servable",
    sections
  };
}

function compositeAspectSummary(
  aspect: { from: string; to: string; type: string; orb: number } | null,
  chartName: string,
  comparisonName: string,
  comparisonIsSelf: boolean,
  generatedContent?: GeneratedContentMap,
  relationshipType?: string | null
) {
  if (!aspect) {
    return "No single aspect is dominating the relationship chart. The placements matter more here: they show the bond's tone, needs, and recurring sensitivities.";
  }

  void generatedContent;
  void relationshipType;
  const normalized = normalizeCompositeAspectSurface(aspect);
  const body = normalized.sections[0]?.body ?? "";

  return repairRelationshipFallbackGrammar(
    relationshipGeneratedCopyForPerspective(body, chartName, comparisonName, comparisonIsSelf)
  );
}

function compositePlacementRows(sky: SkySnapshot, generatedContent?: GeneratedContentMap): SocialPlacementRow[] {
  void generatedContent;
  return socialPlacementRows(sky).map((row) => {
    const normalized = normalizeCompositePlacementSurface({
      planet: row.label,
      sign: row.sign,
      house: row.house
    });
    const description = repairRelationshipFallbackGrammar(relationshipGeneratedCopyForPerspective(
      normalized.sections[0]?.body ?? row.description ?? "",
      "the relationship",
      "you",
      true
    ));

    return description ? { ...row, description } : row;
  });
}

function relationshipTimingSummary(
  transit: TransitItem,
  person: string,
  generatedContent?: GeneratedContentMap,
  fallback = "",
  generatedAt = new Date().toISOString()
) {
  void generatedContent;
  void person;

  return normalizedSurfacePreview(normalizePersonalTransitSurface(transit, generatedAt)) || fallback;
}

function relationshipTiming(
  profileTransits: TransitItem[],
  friendTransits: TransitItem[],
  chart: ManualChart,
  generatedContent?: GeneratedContentMap,
  generatedAt = new Date().toISOString()
) {
  const sharedPlanets = profileTransits.flatMap((yourTransit) => (
    friendTransits
      .filter((friendTransit) => friendTransit.transitPlanet === yourTransit.transitPlanet)
      .map((friendTransit) => ({ yourTransit, friendTransit }))
  ));

  if (sharedPlanets.length > 0) {
    return sharedPlanets.slice(0, 3).map(({ yourTransit, friendTransit }) => ({
      title: `Both charts are feeling ${yourTransit.transitPlanet}`,
      body: relationshipTimingSummary(yourTransit, "you", generatedContent, "", generatedAt)
    }));
  }

  return friendTransits.slice(0, 2).map((transit) => ({
    title: `${chart.displayName} may be feeling ${transit.transitPlanet}`,
    body: relationshipTimingSummary(transit, chart.displayName, generatedContent, "", generatedAt)
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
  const normalizeCircleBody = (body: string, sourceKeys: string[]) => normalizedSurfacePreview(normalizeMadlibCardSurface({
    body,
    sourceKeys,
    surface: "circle-feed",
    slot: "summary"
  }));

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
        body: normalizeCircleBody(
          `${names} are all being touched by ${planet} right now. ${groupPlanetFeedNotice(planet)} ${groupPlanetSocialCue(planet)}`,
          [`circleFeed.planet.${normalizeContentIdPart(planet)}`]
        ),
        previewCharts: uniqueCharts.slice(0, 2).map(circleFeedPreviewChart),
        detail: circlePlanetDetailArticle(planet, uniqueCharts, currentSky, focusAreas, sunriseOrb)
      };
    }).filter((card) => card.body);
  const houseCards = Array.from(byHouse.entries())
    .filter(([, activeCharts]) => new Set(activeCharts.map((chart) => chart.id)).size >= 2)
    .map(([house, activeCharts]) => {
      const uniqueCharts = Array.from(new Map(activeCharts.map((chart) => [chart.id, chart])).values());
      const names = readableNameList(uniqueCharts.slice(0, 3).map((chart) => chart.displayName));

      return {
        title: groupHouseHeadline(house),
        body: normalizeCircleBody(
          `${names} may all be dealing with ${groupHousePlainTopic(house)} in different ways. ${groupHouseFeedNotice(house)} ${groupHouseSocialCue(house)}`,
          [`circleFeed.house.${house}`]
        ),
        previewCharts: uniqueCharts.slice(0, 2).map(circleFeedPreviewChart),
        detail: circleHouseDetailArticle(house, uniqueCharts, currentSky, focusAreas, sunriseOrb)
      };
    }).filter((card) => card.body);
  const profectionCards = Array.from(byProfectedHouse.entries())
    .filter(([, activeCharts]) => activeCharts.length >= 2)
    .map(([house, activeCharts]) => {
      const names = readableNameList(activeCharts.slice(0, 3).map((chart) => chart.displayName));

      return {
        title: groupHouseHeadline(house),
        body: normalizeCircleBody(
          `${names} may all be dealing with ${groupHousePlainTopic(house)} in different ways this year. ${groupHouseFeedNotice(house)} ${groupHouseSocialCue(house)}`,
          [`circleFeed.profectionHouse.${house}`]
        ),
        previewCharts: activeCharts.slice(0, 2).map(circleFeedPreviewChart),
        detail: circleProfectionDetailArticle(house, activeCharts, currentSky, focusAreas, sunriseOrb)
      };
    }).filter((card) => card.body);
  const lordCards = Array.from(byLordOfYear.entries())
    .filter(([, activeCharts]) => activeCharts.length >= 2)
    .map(([planet, activeCharts]) => {
      const names = readableNameList(activeCharts.slice(0, 3).map((chart) => chart.displayName));

      return {
        title: groupPlanetHeadline(planet),
        body: normalizeCircleBody(
          `${names} may all be dealing with ${groupPlanetPlainTopic(planet)} in different ways this year. ${groupPlanetFeedNotice(planet)} ${groupPlanetSocialCue(planet)}`,
          [`circleFeed.lordOfYear.${normalizeContentIdPart(planet)}`]
        ),
        previewCharts: activeCharts.slice(0, 2).map(circleFeedPreviewChart),
        detail: circleLordOfYearDetailArticle(planet, activeCharts, currentSky, focusAreas, sunriseOrb)
      };
    }).filter((card) => card.body);

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
  const normalizeCirclePreviewBody = (body: string | null | undefined, sourceKeys: string[]) => normalizedSurfacePreview(normalizeMadlibCardSurface({
    body,
    sourceKeys,
    surface: "circle-feed-preview",
    slot: "summary"
  }));

  if (circleCards.length > 0) {
    return circleCards.map((card) => ({
      ...card,
      label: "Shared timing",
      body: normalizeCirclePreviewBody(card.body, [`circleFeedPreview.${normalizeContentIdPart(card.title)}`])
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
        body: normalizeCirclePreviewBody(
          topTransit ? friendUpdateSummary(chart, topTransit, generatedContent, currentSky.generatedAt) : timingSummary(chart, timing),
          topTransit
            ? [`circleFeedPreview.singleChart.friendTransit.${topTransit.id}`]
            : ["circleFeedPreview.singleChart.timing"]
        ),
        previewCharts: [circleFeedPreviewChart(chart)]
      },
      {
        label: "Comparison chart",
        title: `${chart.displayName} and you`,
        body: normalizeCirclePreviewBody(
          "Start with the strongest contacts between your charts, then look at where each person's planets land. That shows what feels easy, what gets stirred up, and where the relationship needs more care.",
          ["circleFeedPreview.singleChart.comparison"]
        ),
        previewCharts: [circleFeedPreviewChart(chart)]
      },
      {
        label: "Relationship timing",
        title: "What each person is carrying",
        body: normalizeCirclePreviewBody(
          relationshipTiming(
            profileTransits,
            rankedFriendTransits(currentSky, chart, sunriseOrb),
            chart,
            generatedContent,
            currentSky.generatedAt
          )[0]?.body
            ?? "Look at what today's sky is touching in each chart. That can make it easier to tell the difference between relationship tension and personal timing.",
          ["circleFeedPreview.singleChart.relationshipTiming"]
        ),
        previewCharts: [circleFeedPreviewChart(chart)]
      }
    ].filter((card) => card.body);
  }

  return [
    {
      label: "Friend transits",
      title: "Current astrology for each person",
      body: normalizeCirclePreviewBody(
        "Add a chart to see what the current sky is bringing up in that person's chart.",
        ["circleFeedPreview.empty.friendTransits"]
      )
    },
    {
      label: "Shared timing",
      title: "Patterns across your circle",
      body: normalizeCirclePreviewBody(
        "With two or more saved charts, this looks for repeated timing signals: the same active planet, house topic, profection house, or lord of year showing up for more than one person.",
        ["circleFeedPreview.empty.sharedTiming"]
      )
    },
    {
      label: "Between Us",
      title: "Relationship timing",
      body: normalizeCirclePreviewBody(
        "Select a friend to compare what the current sky is doing to you, to them, and to the relationship pattern.",
        ["circleFeedPreview.empty.relationshipTiming"]
      )
    }
  ].filter((card) => card.body);
}

function isAdminContentPath() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.location.pathname === "/admin/content" ||
    window.location.pathname === "/admin/generated-content" ||
    window.location.pathname === "/content/admin"
  );
}

const GeneratedContentAdminDashboard = lazy(() =>
  import("../../admin/src/GeneratedContentAdminDashboard").then((module) => ({
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
  const [journalPromptsEnabled, setJournalPromptsEnabled] = useState(getInitialJournalPrompts);
  const [guestHouseSignLabelStyle, setGuestHouseSignLabelStyle] = useState<HouseSignLabelStyle>(getInitialHouseSignLabelStyle);
  const [skyDate, setSkyDate] = useState(dateInputValue);
  const [mode, setMode] = useState<PortalMode>(getInitialPortalMode);
  const [location, setLocation] = useState<LocationInput>(initialLocationState.location);
  const [manualLocation, setManualLocation] = useState(initialLocationState.location.label);
  const [hasLocationPreference, setHasLocationPreference] = useState(initialLocationState.hasSavedLocation);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [cityPickerOpenedFromMobileControls, setCityPickerOpenedFromMobileControls] = useState(false);
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
  const appliedAuthAccountIdRef = useRef<string | null>(null);
  const remoteProfileReadyRef = useRef(false);
  const [accountIntent, setAccountIntent] = useState<AuthMode>("create");
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [chartModalStep, setChartModalStep] = useState<"overview" | "birth" | "city">("overview");
  const [transitsDrawn, setTransitsDrawn] = useState(false);
  const [profileTransits, setProfileTransits] = useState<TransitItem[]>([]);
  const [profileNatalSky, setProfileNatalSky] = useState<SkySnapshot | null>(null);
  const [profileNatalAspectPatternStatus, setProfileNatalAspectPatternStatus] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");
  const [personalTiming, setPersonalTiming] = useState<PersonalTimingResponse | null>(null);
  const [personalTimingStatus, setPersonalTimingStatus] = useState<PersonalTimingStatus>("idle");
  const [personalTimingGenerated, setPersonalTimingGenerated] = useState<LiveGeneratedContent | null>(null);
  const [personalTimingGeneratedStatus, setPersonalTimingGeneratedStatus] = useState<PersonalTimingStatus>("idle");
  const [personalTransitGeneratedContent, setPersonalTransitGeneratedContent] = useState<GeneratedContentMap>(() => new Map());
  const [selectedTransitId, setSelectedTransitId] = useState(sampleTransits[0].id);
  const [skyRefreshKey, setSkyRefreshKey] = useState(() => Date.now());
  const lastRemoteProfileSaveRef = useRef("");
  const initialSkyCacheKey = skySnapshotCacheKey(initialLocationState.location, dateInputValue());
  const initialCachedSky = readCachedSkySnapshot(initialSkyCacheKey) ?? readMostRecentCachedSkySnapshot();
  const [sky, setSky] = useState<SkySnapshot | null>(() => initialCachedSky);
  const [skyStatus, setSkyStatus] = useState<SkyLoadStatus>(initialCachedSky ? "ready" : "loading");
  const [skyGeneratedContent, setSkyGeneratedContent] = useState<GeneratedContentMap>(() => normalizedSkySnapshotContent);
  const [natalGeneratedContent, setNatalGeneratedContent] = useState<GeneratedContentMap>(() => new Map());
  const [relationshipGeneratedContent, setRelationshipGeneratedContent] = useState<GeneratedContentMap>(() => new Map());
  const [fallbackArchitectureV3Version, setFallbackArchitectureV3Version] = useState(0);
  const [settingsGeneratedContent, setSettingsGeneratedContent] = useState<GeneratedContentMap>(() => new Map());
  const [generatedContentPreviewMode, setGeneratedContentPreviewMode] = useState<GeneratedContentPreviewMode>(readGeneratedContentPreviewMode);
  const [, setPlanetTopicVocabularyVersion] = useState(0);
  const [, setCareerVocabularyVersion] = useState(0);
  const [, setNatalCardTaglineVersion] = useState(0);
  const [selectedSkyDetail, setSelectedSkyDetail] = useState<SkyDetail | null>(null);
  const [skyDetailRoutePath, setSkyDetailRoutePath] = useState<string | null>(skyDetailRoutePathFromUrl);
  const [, setContentRegistryVersion] = useState(0);
  const selectedSkyDetailRefreshKeyRef = useRef("");
  const userLifeAreaFocus = userProfile ? normalizeChartSettings(userProfile.settings).lifeAreaFocus : [];
  const activeHouseSignLabelStyle = userProfile
    ? normalizeChartSettings(userProfile.settings).houseSignLabelStyle
    : guestHouseSignLabelStyle;
  const showNatalAspectPatterns = natalAspectPatternReaderEnabled();
  const showNatalAspectPatternActivation = showNatalAspectPatterns && natalAspectPatternActivationEnabled();
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
      setSkyDetailRoutePath(detail.routePath);
      updateSkyDetailRouteUrl(detail.routePath);
    }
  }

  function openCalendarTransitDetail(event: LunarCalendarEvent) {
    if (!sky || event.type === "lunation") {
      return;
    }

    const generatedAt = event.startsAt || sky.generatedAt;

    if (event.type === "aspect" && event.planets && event.aspect) {
      const [planetA, planetB] = event.planets;
      const eventAspect = event.aspect.toLowerCase();
      const matchingAspect = sky.aspects.find((aspect) => (
        aspect.from === planetA
        && aspect.to === planetB
        && aspect.type.toLowerCase() === eventAspect
      )) ?? sky.aspects.find((aspect) => (
        aspect.from === planetB
        && aspect.to === planetA
        && aspect.type.toLowerCase() === eventAspect
      ));
      const detailAspect: SkySnapshot["aspects"][number] = matchingAspect ?? {
        from: planetA,
        to: planetB,
        type: event.aspect,
        orb: 0
      };

      openSkyDetail(currentSkyAspectDetailArticle(detailAspect, generatedAt, skyGeneratedContent, sky.positions));
      return;
    }

    if (!event.planet) {
      return;
    }

    const position = sky.positions.find((candidate) => candidate.planet === event.planet);

    if (!position) {
      return;
    }

    const eventSign = event.toSign ?? event.sign;
    const isRetrogradeEvent = event.title.toLowerCase().includes("retrograde");
    const eventDegree = typeof event.longitude === "number"
      ? normalizedAngle(event.longitude) % 30
      : eventSign && eventSign !== position.sign
        ? 0
        : position.degree;
    const eventPosition: PlanetPosition = {
      ...position,
      degree: eventDegree,
      sign: eventSign ?? position.sign,
      signGlyph: eventSign ? signGlyph(eventSign) : position.signGlyph,
      motion: isRetrogradeEvent ? "retrograde" : position.motion,
      transitStart: event.type === "ingress" ? event.startsAt : position.transitStart,
      transitEnd: event.type === "ingress" ? event.endsAt ?? null : position.transitEnd
    };

    if (event.type === "station" && isRetrogradeEvent) {
      openSkyDetail(currentSkyRetrogradeDetailData(eventPosition, generatedAt, skyGeneratedContent).detail);
      return;
    }

    openSkyDetail(currentSkyPlacementDetailArticle({
      aspects: sky.aspects,
      generatedAt,
      generatedContent: skyGeneratedContent,
      onOpenDetail: openSkyDetail,
      position: eventPosition,
      positions: sky.positions
    }));
  }

  function closeSkyDetail() {
    const routePath = selectedSkyDetail?.routePath;

    setSelectedSkyDetail(null);
    setSkyDetailRoutePath(null);
    if (routePath?.startsWith("friends?")) {
      const { params } = friendsHashParts(`#${routePath}`);
      const chartId = params.get("chart");

      if (chartId) {
        updateFriendProfileUrl(chartId, parseFriendProfileTab(params.get("view")), "push");
        storePortalMode("friends");
        setMode("friends");
        return;
      }
    }

    updatePortalModeUrl(userProfile ? "member" : "guest", "push");
  }

  function navigateToFriends() {
    const nextTab = initialFriendsTab();

    setSelectedSkyDetail(null);
    setSkyDetailRoutePath(null);
    updateFriendsTabUrl(nextTab, "push");
    storeFriendsTab(nextTab);
    storePortalMode("friends");
    setFriendsLandingKey((currentKey) => currentKey + 1);
    setMode("friends");
  }

  function navigateToPortalMode(nextMode: PortalMode) {
    setSelectedSkyDetail(null);
    setSkyDetailRoutePath(null);
    updatePortalModeUrl(nextMode, "push");
    storePortalMode(nextMode);
    setMode(nextMode);
  }

  useEffect(() => {
    let cancelled = false;

    loadFallbackArchitectureV3DashboardBundle()
      .then((bundle) => {
        if (!bundle || cancelled) {
          return;
        }

        installFallbackArchitectureV3Bundle(bundle);
        setFallbackArchitectureV3Version((version) => version + 1);
      })
      .catch((error) => {
        console.warn("Fallback architecture V3 dashboard bundle failed to install; local JSON snapshot remains active.", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handlePortalUrlChange() {
      const urlMode = portalModeFromUrl();

      if (!urlMode) {
        return;
      }

      const nextMode = urlMode === "member" && !userProfile ? "guest" : urlMode;
      const nextSkyDetailRoutePath = skyDetailRoutePathFromUrl();

      storePortalMode(nextMode);
      setSkyDetailRoutePath(nextSkyDetailRoutePath);
      if (nextSkyDetailRoutePath) {
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
    if (!skyDetailRoutePath?.startsWith("sky/") || !sky) {
      return;
    }

    const refreshKey = `${skyDetailRoutePath}:${fallbackArchitectureV3Version}`;

    if (
      selectedSkyDetail?.routePath === skyDetailRoutePath
      && selectedSkyDetailRefreshKeyRef.current === refreshKey
    ) {
      return;
    }

    const detail = skyDetailFromRoutePath(skyDetailRoutePath, sky, skyGeneratedContent, openSkyDetail);

    selectedSkyDetailRefreshKeyRef.current = refreshKey;
    setSelectedSkyDetail(detail);
  }, [fallbackArchitectureV3Version, selectedSkyDetail?.routePath, sky, skyDetailRoutePath, skyGeneratedContent]);

  useEffect(() => {
    if (!selectedSkyDetail) {
      return;
    }

    setDatePickerOpen(false);
    setMobileSkyControlsOpen(false);
    setCityPickerOpen(false);
    setCityPickerOpenedFromMobileControls(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.scrollingElement?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [selectedSkyDetail]);

  useEffect(() => subscribeContentRegistry(() => {
    setContentRegistryVersion((version) => version + 1);
  }), []);

  useEffect(() => {
    const syncPreviewMode = () => {
      setGeneratedContentPreviewMode(readGeneratedContentPreviewMode());
    };

    window.addEventListener(generatedContentPreviewModeChangeEvent, syncPreviewMode);
    window.addEventListener("storage", syncPreviewMode);

    return () => {
      window.removeEventListener(generatedContentPreviewModeChangeEvent, syncPreviewMode);
      window.removeEventListener("storage", syncPreviewMode);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadPlanetTopicVocabulary()
      .then(() => {
        if (!cancelled) {
          setPlanetTopicVocabularyVersion((version) => version + 1);
        }
      })
      .catch((error) => {
        console.warn("Planet topic vocabulary failed to initialize; code fallbacks will be used.", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadCareerVocabulary()
      .then(() => {
        if (!cancelled) {
          setCareerVocabularyVersion((version) => version + 1);
        }
      })
      .catch((error) => {
        console.warn("Career vocabulary failed to initialize; code fallbacks will be used.", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadNatalCardTaglines()
      .then(() => {
        if (!cancelled) {
          setNatalCardTaglineVersion((version) => version + 1);
        }
      })
      .catch((error) => {
        console.warn("Natal card taglines failed to initialize; code fallbacks will be used.", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const shouldLoadSkyGenerated = mode === "guest" || mode === "member";

    if (!shouldLoadSkyGenerated) {
      setSkyGeneratedContent(normalizedSkySnapshotContent);
      return () => {
        cancelled = true;
      };
    }

    loadLiveGeneratedContent("sky", skyDate)
      .then((content) => {
        if (!cancelled) {
          setSkyGeneratedContent(mergeGeneratedContentMaps(content, normalizedSkySnapshotContent));
        }
      })
      .catch((error) => {
        console.warn("Live Sky interpretations failed to load; unpublished content will remain hidden.", error);
        if (!cancelled) {
          setSkyGeneratedContent(normalizedSkySnapshotContent);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [generatedContentPreviewMode, mode, skyDate]);

  useEffect(() => {
    let cancelled = false;
    const shouldLoadNatal = ["guest", "member", "profile", "friends"].includes(mode);

    if (!shouldLoadNatal) {
      setNatalGeneratedContent(new Map());
      return () => {
        cancelled = true;
      };
    }

    loadLiveGeneratedContentForSurfaces(["natal", "you"], skyDate)
      .then((content) => {
        if (!cancelled) {
          setNatalGeneratedContent(content);
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
  }, [generatedContentPreviewMode, mode, skyDate]);

  useEffect(() => {
    let cancelled = false;
    const shouldLoadRelationships = mode === "friends";

    if (!shouldLoadRelationships) {
      setRelationshipGeneratedContent(new Map());
      return () => {
        cancelled = true;
      };
    }

    loadLiveGeneratedContentForSurfaces(["relationship", "synastry", "composite"], skyDate)
      .then((content) => {
        if (!cancelled) {
          setRelationshipGeneratedContent(content);
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
  }, [generatedContentPreviewMode, mode, skyDate]);

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
  }, [generatedContentPreviewMode, mode, skyDate]);

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
      setCityPickerOpenedFromMobileControls(false);
      if (restoreFocus) {
        (cityPickerTriggerRef.current ?? mobileDatePickerTriggerRef.current)?.focus();
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
    const cacheKey = skySnapshotCacheKey(skyLocation, skyDate);
    const cachedSky = readCachedSkySnapshot(cacheKey);

    if (cachedSky) {
      setSky(cachedSky);
      setSkyStatus("ready");
    } else if (isFriendsMode) {
      const recentSky = readMostRecentCachedSkySnapshot();

      if (recentSky) {
        setSky((currentSky) => currentSky ?? recentSky);
        setSkyStatus((currentStatus) => currentStatus === "ready" ? currentStatus : "loading");
      } else {
        setSkyStatus("loading");
      }
    } else {
      setSkyStatus("loading");
    }

    getAstrodienstSky(skyLocation, selectedDateTime, { includeTransitWindows: true })
      .then((nextSky) => {
        if (!cancelled) {
          const validation = skyFactValidation(nextSky);

          if (!validation.ok) {
            logSkyFactDiagnostic("fresh-calculation", nextSky, validation.diagnostics);
            setSky(null);
            setSkyStatus("error");
            return;
          }

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
      window.localStorage.setItem(journalPromptsStorageKey, journalPromptsEnabled ? "true" : "false");
    } catch {
      return;
    }
  }, [journalPromptsEnabled]);

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
      journalPromptsEnabled,
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
    journalPromptsEnabled,
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

    if (!birthDate || !birthCity || !birthTime || !primaryChart?.birthLocation?.timeZone) {
      setProfileNatalSky(null);
      setProfileNatalAspectPatternStatus("idle");
      return;
    }

    const unknownBirthTime = birthTime === "Time unknown";
    let cancelled = false;
    const birthLocation = primaryChart.birthLocation;
    const birthDateTime = zonedDateTimeToUtc(birthDate, unknownBirthTime ? "12:00 PM" : birthTime, birthLocation.timeZone);

    getAstrodienstSky(birthLocation, birthDateTime)
      .then((calculatedNatalSky) => {
        if (cancelled) {
          return;
        }

        const natalSky = calculatedNatalSky;
        const natalBigThree = natalBigThreeFromSky(natalSky, unknownBirthTime);
        const nextTransits = sky
          ? rankedProfileTransits(sky, natalSky, birthDate, activeSunriseOrbDegrees)
          : [];

        setProfileNatalSky(natalSky);
        setProfileNatalAspectPatternStatus(showNatalAspectPatterns ? "loading" : "idle");
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

        if (showNatalAspectPatterns) {
          fetchNatalAspectPatternsWithCopy(birthLocation, birthDateTime, { includeActivationCopy: showNatalAspectPatternActivation })
            .then((aspectPatterns) => {
              if (cancelled) {
                return;
              }

              setProfileNatalSky((currentSky) => (
                currentSky?.generatedAt === calculatedNatalSky.generatedAt
                  ? skyWithNatalAspectPatternCopy(currentSky, aspectPatterns)
                  : currentSky
              ));
              setProfileNatalAspectPatternStatus("ready");
            })
            .catch((error) => {
              if (!cancelled) {
                console.warn("Natal aspect-pattern copy request failed.", error);
                setProfileNatalAspectPatternStatus("unavailable");
              }
            });
        }
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
    activeSunriseOrbDegrees,
    showNatalAspectPatterns,
    showNatalAspectPatternActivation
  ]);

  useEffect(() => {
    if (!isProfileMode || !userProfile || !isTldrAstroApiConfigured) {
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
    isProfileMode,
    skyDate
  ]);

  useEffect(() => {
    const primaryChart = userProfile?.charts[0];

    if (!isProfileMode || !userProfile || !remoteAccountId || !primaryChart || !personalTiming || personalTimingStatus !== "ready") {
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
            "Write this as the user's personal daily horoscope for the Transits page.",
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
    isProfileMode,
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

    if (!isProfileMode || !userProfile || !remoteAccountId || !primaryChart || !transitsDrawn) {
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
    isProfileMode,
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

  const applyAuthAccount = useCallback(async (account: AuthAccount | null, isCancelled: () => boolean) => {
    if (isCancelled()) {
      return;
    }

    if (account && appliedAuthAccountIdRef.current === account.id && remoteProfileReadyRef.current) {
      setAuthAccountChecked(true);
      return;
    }

    setAuthAccountChecked(false);

    if (!account) {
      appliedAuthAccountIdRef.current = null;
      remoteProfileReadyRef.current = false;
      setRemoteAccountId(null);
      setRemoteProfileReady(false);
      lastRemoteProfileSaveRef.current = "";
      setMode(unauthenticatedLandingMode);
      setAuthAccountChecked(true);
      return;
    }

    appliedAuthAccountIdRef.current = account.id;
    remoteProfileReadyRef.current = false;
    setRemoteAccountId(account.id);
    setRemoteProfileReady(false);

    const pendingForm = readPendingSignupForm();
    const cachedLocalProfile = getInitialUserProfile();
    let persistedProfileId: string | null = null;

    try {
      const persistedProfile = await loadPersistedProfile(account.id);

      if (isCancelled()) {
        return;
      }

      if (isProfilePersistencePayload(persistedProfile)) {
        persistedProfileId = persistedProfile.profile.id;
        const remoteTheme = persistedProfile.preferences?.theme;
        const remoteSunriseOrb = persistedProfile.preferences?.sunriseOrbEnabled;
        const remoteDyslexiaFont = persistedProfile.preferences?.dyslexiaFriendlyFont;
        const remoteJournalPrompts = persistedProfile.preferences?.journalPromptsEnabled;
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
        if (typeof remoteJournalPrompts === "boolean") {
          setJournalPromptsEnabled(remoteJournalPrompts);
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
          account.id,
          ...listLocalManualChartUserIds()
        ]);
      } catch (migrationError) {
        console.warn("Local manual chart migration failed; charts will remain in the local cache.", migrationError);
      }
      clearPendingSignupForm();
      setMode((currentMode) => authenticatedLandingMode(currentMode, restoredPortalModeRef.current));
      remoteProfileReadyRef.current = true;
      setRemoteProfileReady(true);
      setAuthAccountChecked(true);
    } catch (error) {
      if (isCancelled()) {
        return;
      }

      console.warn("Supabase profile load failed; using local profile cache.", error);
      setUserProfile(profileForAuthAccount(cachedLocalProfile ?? createUserProfile(pendingForm, "email", account), account));
      try {
        await migrateLocalManualChartsToRemote(account.id, [
          cachedLocalProfile?.id,
          account.id,
          ...listLocalManualChartUserIds()
        ]);
      } catch (migrationError) {
        console.warn("Local manual chart migration failed; charts will remain in the local cache.", migrationError);
      }
      clearPendingSignupForm();
      setMode((currentMode) => authenticatedLandingMode(currentMode, restoredPortalModeRef.current));
      remoteProfileReadyRef.current = true;
      setRemoteProfileReady(true);
      setAuthAccountChecked(true);
    }
  }, []);

  useEffect(() => {
    if (!shouldBootstrapAuth(mode)) {
      setAuthAccountChecked(true);
      return;
    }

    let cancelled = false;
    const isCancelled = () => cancelled;

    getAuthAccount()
      .then((account) => {
        void applyAuthAccount(account, isCancelled);
      })
      .catch(() => {
        if (!cancelled) {
          setAuthAccountChecked(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!shouldBootstrapAuth(mode)) {
      return;
    }

    let cancelled = false;
    const isCancelled = () => cancelled;
    const unsubscribe = onAuthAccountChange((account) => {
      if (cancelled) {
        return;
      }

      void applyAuthAccount(account, isCancelled);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [applyAuthAccount, mode]);

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
    function refreshSky(event: PageTransitionEvent) {
      if (event.persisted) {
        setSkyRefreshKey(Date.now());
      }
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
    setCityPickerOpenedFromMobileControls(false);
    (cityPickerTriggerRef.current ?? mobileDatePickerTriggerRef.current)?.focus();
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
    setCityPickerOpenedFromMobileControls(false);
    (cityPickerTriggerRef.current ?? mobileDatePickerTriggerRef.current)?.focus();
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
        ? transitForm.birthLocation.timeZone
          ? transitForm.birthLocation
          : null
        : null
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
      if (birthCity && !birthLocation) {
        setChartModalStep("birth");
        return;
      }

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
    setCityPickerOpenedFromMobileControls(false);
    setMobileSkyControlsOpen(false);
  }

  function openMobileDatePicker() {
    setMobileSkyControlsOpen(false);
    setCityPickerOpen(false);
    setCityPickerOpenedFromMobileControls(false);
    setDatePickerOpen(true);
  }

  function openMobileCityPicker() {
    setMobileSkyControlsOpen(false);
    setDatePickerOpen(false);
    setCityPickerOpenedFromMobileControls(true);
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
                setCityPickerOpenedFromMobileControls(false);
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
          <SkyDetailArticle detail={selectedSkyDetail} onClose={closeSkyDetail} />
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
                      aspectInspector
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
                      <h1 className="sky-intro__lead">{formatSkyHeroTitle()}</h1>
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
                        className={`city-picker hero-city-picker${cityPickerOpenedFromMobileControls ? " hero-city-picker--mobile" : ""}`}
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
                              setCityPickerOpenedFromMobileControls(false);
                              (cityPickerTriggerRef.current ?? mobileDatePickerTriggerRef.current)?.focus();
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
                          setCityPickerOpenedFromMobileControls(false);
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
                      onOpenDetail={openSkyDetail}
                    />
                  )}
                  {!isSkyLoading && sky && mode === "guest" && (
                    <TodayView
                      positions={sky.positions}
                      aspects={sky.aspects}
                      generatedAt={sky.generatedAt}
                      generatedContent={skyGeneratedContent}
                      lifeAreaFocus={[]}
                      onOpenDetail={openSkyDetail}
                    />
                  )}
                  {!isSkyLoading && sky && mode === "member" && (
                    <TodayView
                      positions={sky.positions}
                      aspects={sky.aspects}
                      generatedAt={sky.generatedAt}
                      generatedContent={skyGeneratedContent}
                      lifeAreaFocus={userLifeAreaFocus}
                      onOpenDetail={openSkyDetail}
                    />
                  )}
                  {!isSkyLoading && sky && (
                    <CalculationDiagnosticsPanel
                      generatedContent={skyGeneratedContent}
                      hydrationState={skyGeneratedContent === normalizedSkySnapshotContent ? "snapshot" : "hydrated"}
                      sky={sky}
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
                  onOpenTransit={openCalendarTransitDetail}
                  showJournalPrompts={journalPromptsEnabled}
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
                      currentSky={sky}
                      natalSky={profileNatalSky}
                      natalAspectPatternLoadStatus={profileNatalAspectPatternStatus}
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
                    chartRefreshKey={remoteProfileReady ? 1 : 0}
                    chartsReady={remoteAccountId ? remoteProfileReady : authAccountChecked}
                    allowCachedChartsWhileLoading={!isAuthConfigured}
                    onOpenDetail={openSkyDetail}
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
                      journalPromptsEnabled={journalPromptsEnabled}
                      generatedContent={settingsGeneratedContent}
                      onDyslexiaFontChange={setDyslexiaFriendlyFont}
                      onJournalPromptsChange={setJournalPromptsEnabled}
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
                      journalPromptsEnabled={journalPromptsEnabled}
                      onDyslexiaFontChange={setDyslexiaFriendlyFont}
                      onJournalPromptsChange={setJournalPromptsEnabled}
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
                        aspectInspector
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

function retrogradeCollapsedName(position: PlanetPosition) {
  const name = skyDisplayPlanetName(position.planet);
  return name === "North Node" ? name : `${name} Rx`;
}

function retrogradeAttentionTopic(planet: string) {
  return planetTopicPhrase(planet, "sky") || fallbackV3PlanetTopic(planet);
}

function generatedRetrogradeSummaryMatchesPlanets(summary: string, retrogrades: PlanetPosition[]) {
  const normalizedSummary = normalizedArticleCopy(summary);
  const requiredNames = retrogrades.map(retrogradeCollapsedName).map(normalizedArticleCopy);
  const knownNames = [
    "Mercury Rx",
    "Venus Rx",
    "Mars Rx",
    "Jupiter Rx",
    "Saturn Rx",
    "Uranus Rx",
    "Neptune Rx",
    "Pluto Rx",
    "Chiron Rx",
    "North Node"
  ].map(normalizedArticleCopy);
  const namesMentioned = knownNames.some((name) => normalizedSummary.includes(name));

  if (!namesMentioned) {
    return true;
  }

  return requiredNames.every((name) => normalizedSummary.includes(name));
}

function retrogradeSummaryFallback(retrogrades: PlanetPosition[], personal: PlanetPosition[]) {
  if (retrogrades.length === 0) {
    return "";
  }

  const fastest = personal[0] ?? retrogrades[0];
  const fastestLabel = retrogradeCollapsedName(fastest);

  return `${fastestLabel} is likely to stand out first, drawing attention to ${retrogradeAttentionTopic(fastest.planet)}. The slower retrogrades point to longer patterns still unfolding in the background.`;
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

function stripRetrogradeGeneratedHeaderParagraphs(position: PlanetPosition, paragraphs: string[]) {
  const removable = [
    retrogradePlacementTitle(position),
    retrogradePlacementTitle(position).replace(/\bRx\b/u, "Retrograde"),
    retrogradeRangeText(position) ?? ""
  ]
    .map((value) => normalizedArticleCopy(value.replace(/\s*[-–]\s*/gu, " to ")))
    .filter(Boolean);

  return paragraphs.filter((paragraph, index) => {
    if (index > 1) {
      return true;
    }

    const normalizedParagraph = normalizedArticleCopy(
      paragraph
        .replace(/^\*\*(.+?)\*\*$/u, "$1")
        .replace(/\s*[-–]\s*/gu, " to ")
    );

    return !removable.includes(normalizedParagraph);
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

function lowerInitialFragment(value: string) {
  const trimmed = value.trim();

  return trimmed ? `${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}` : "";
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
    lived: "conversation, learning, writing, and the way you navigate your immediate world"
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

const blockedComposerCopyPatterns = [
  /\bmoves through\b.+\btone\b/i,
  /\bgives\b.+\bquality right now\b/i,
  /\bshows up in\b.+\bthe bigger picture\b/i,
  /\bAt work this reads as\b/i,
  /\bLuck favors\b/i,
  /\bWatch:\s*/i,
  /\boverplaying the drama\b/i,
  /\bthe fuller story of this\b/i,
  /\bfollows .+ to wherever it sits\b/i,
  /\bBeing themselves and\b/i,
  /\bThis placement describes how\b/i,
  /\basks for attention in real life\b/i,
  /\bwhere the placement asks for one clear, grounded response\b/i
];

function isBlockedComposerCopy(text: string) {
  return blockedComposerCopyPatterns.some((pattern) => pattern.test(text));
}

function readerParagraphsWithoutBlockedComposerCopy(values: Array<string | null | undefined>) {
  return readerFacingParagraphs(values).filter((paragraph) => !isBlockedComposerCopy(paragraph));
}

function contentFallbackArticleParagraphs(content?: Partial<Pick<ContentFallback, "summary" | "body" | "detailParagraphs">> | null) {
  const sourceParagraphs = content?.detailParagraphs?.length
    ? content.detailParagraphs
    : [content?.body, content?.summary];
  const seen = new Set<string>();

  return readerParagraphsWithoutBlockedComposerCopy(sourceParagraphs).filter((paragraph) => {
    const key = paragraph.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

type FallbackV3AngleKey = "ascendant" | "midheaven" | "descendant" | "imum-coeli";

function normalizedNatalAngleKey(point: string): FallbackV3AngleKey | "" {
  const normalized = normalizeContentIdPart(point);

  if (normalized === "mc") return "midheaven";
  if (normalized === "ic") return "imum-coeli";
  if (normalized === "ascendant" || normalized === "descendant" || normalized === "midheaven" || normalized === "imum-coeli") {
    return normalized;
  }

  return "";
}

function natalAngleFallbackV3NormalizedSections(position: PlanetPosition, ownerContext?: ChartOwnerContext): NormalizedNatalPlacementSection[] {
  const angle = normalizedNatalAngleKey(position.planet);

  if (!angle) {
    return [];
  }

  try {
    const sign = normalizeContentIdPart(position.sign);
    const rendered = fallbackRendererV3.renderNatalAngle({
      angle,
      sign,
      voice: ownerContext?.ownerName ?? "you"
    });
    const body = readerFacingParagraphs(rendered.parts).join("\n\n");

    if (!body || !isReaderFacingCopy(body)) {
      return [];
    }

    return [{
      slot: "angle",
      required: true,
      layer: "fallback",
      tier: "fallback-architecture-v3",
      sourceKeys: [
        "tldrastro-fallback-architecture-v3",
        rendered.templateKey,
        `fallback-hook/angle-intro/${angle}`,
        `fallback-hook/angle-sign/${angle}/${sign}`
      ].filter(Boolean),
      heading: rendered.headline || `${position.planet} in ${position.sign}`,
      body
    }];
  } catch (error) {
    if (error instanceof FallbackV3SourceGapError) {
      return [];
    }

    throw error;
  }
}

function sourceGroundedNatalPlacementNormalizedSections(
  position: PlanetPosition,
  natalSky: SkySnapshot | null
): NormalizedNatalPlacementSection[] {
  return sourceGroundedNatalPlacementSections({
    aspects: natalPlacementAspectFacts(position, natalSky).map((fact) => ({
      aspect: fact.aspectType,
      focalHouse: fact.primaryHouse,
      focalPlanet: fact.primaryPlanet,
      focalSign: fact.primarySign,
      orb: fact.orb,
      otherHouse: fact.aspectPlanetHouse,
      otherPlanet: fact.aspectPlanet,
      otherSign: fact.aspectPlanetSign
    })),
    dignityLabel: placementDignity(position)?.label ?? null,
    natalSky,
    ownerPerspective: "you",
    position
  }).map((section): NormalizedNatalPlacementSection => ({
    slot: /house/i.test(section.heading) ? "house" : "sign",
    required: true,
    layer: "authored",
    tier: "REVIEWED_CLAUSE",
    sourceKeys: [
      "finalSourceGroundedDashboardRecords",
      `dashboard.natal-placement.${normalizeContentIdPart(position.planet)}.${normalizeContentIdPart(position.sign)}${position.house ? `.house_${position.house}` : ""}`
    ],
    heading: section.heading,
    body: section.body
  }));
}

function sourceGroundedNatalPlacementFallbackSections(position: PlanetPosition): NormalizedNatalPlacementSection[] {
  const result = resolveSourceGroundedV2("me.natal_placement", {
    degree: formatPlanetDegree(position),
    natalBody: position.planet,
    natalHouse: position.house ?? null,
    natalSign: position.sign,
    ownerPerspective: "you",
    reliableBirthTime: Boolean(position.house)
  });
  const signFieldBody = firstReaderFacingCopy([
    result.renderedFields.planetSignFallbackStory
  ]);
  const houseFieldBody = firstReaderFacingCopy([
    result.renderedFields.planetSignHouseFallbackStory
  ]);
  const body = firstReaderFacingCopy([
    result.expandedCopy,
    result.renderedFields.integratedSignHouseStory,
    ...result.finalVisibleStrings
  ]);

  if (result.readerAuthority !== "approved-fallback" || !body) {
    return [];
  }

  const sourceKeys = [
    result.fallbackId ?? "",
    ...result.primarySourceKeys,
    ...result.supportingSourceKeys
  ].filter(Boolean);
  const sentences = body
    .replace(/\s+/gu, " ")
    .trim()
    .match(/[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/gu)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) ?? [];
  const signBody = signFieldBody || (position.house && sentences.length > 1
    ? sentences.slice(0, 1).join(" ")
    : body);
  const houseBody = houseFieldBody || (position.house
    ? sentences.slice(1).join(" ").trim()
    : "");
  const sections: NormalizedNatalPlacementSection[] = [{
    slot: "sign",
    required: true,
    layer: "fallback",
    tier: "approved-fallback",
    sourceKeys,
    heading: `${position.planet} in ${position.sign}`,
    body: signBody
  }];

  if (position.house && houseBody) {
    sections.push({
      slot: "house",
      required: true,
      layer: "fallback",
      tier: "approved-fallback",
      sourceKeys,
      heading: `${position.planet} in ${position.sign} in the ${ordinalHouse(position.house)} house`,
      body: houseBody
    });
  }

  return sections;
}

function sourceGroundedNatalAspectSectionsForPlacement(
  position: PlanetPosition,
  natalSky: SkySnapshot | null,
  ownerContext?: ChartOwnerContext
): NormalizedNatalPlacementSection[] {
  return natalPlacementAspectFacts(position, natalSky)
    .map((fact) => {
      const normalizedAspect = normalizeFallbackV3Aspect(fact.aspectType);

      if (!normalizedAspect) {
        return null;
      }

      try {
        const rendered = fallbackRendererV3.renderNatalAspect({
          aspect: normalizedAspect,
          planetA: normalizeContentIdPart(fact.primaryPlanet),
          planetB: normalizeContentIdPart(fact.aspectPlanet),
          voice: ownerContext?.ownerName ?? "you"
        });
        const body = readerFacingParagraphs(rendered.parts).join("\n\n");

        if (!body || !isReaderFacingCopy(body)) {
          return null;
        }

        const fallbackSection: NormalizedNatalPlacementSection = {
          slot: "aspect" as const,
          required: false,
          layer: "fallback" as const,
          tier: "fallback-architecture-v3",
          aspectType: fact.aspectType,
          group: normalizedAspectToneBucket(fact.aspectType),
          sourceKeys: [
            "tldrastro-fallback-architecture-v3",
            rendered.templateKey
          ].filter(Boolean),
          heading: rendered.headline || `${fact.primaryPlanet} ${fact.aspectType} ${fact.aspectPlanet}`,
          body
        };

        return fallbackSection;
      } catch (error) {
        if (error instanceof FallbackV3SourceGapError) {
          return null;
        }

        throw error;
      }
    })
    .filter((section): section is NormalizedNatalPlacementSection => Boolean(section));
}

function placementScaffoldNormalizedSections(position: PlanetPosition, natalSky: SkySnapshot | null): NormalizedNatalPlacementSection[] {
  if (!placementScaffoldHasMinimumCoverage(position)) {
    return [];
  }

  return placementScaffoldSections({
    natalSky,
    position
  }).map((section): NormalizedNatalPlacementSection => ({
    slot: section.kind === "ruler_bridge" ? "ruler" : section.kind,
    required: section.kind === "sign" || section.kind === "house",
    layer: "fallback",
    tier: "source-based-scaffold",
    sourceKeys: [
      "placementScaffoldData",
      `${section.kind}:${normalizeContentIdPart(position.planet)}:${normalizeContentIdPart(position.sign)}${position.house ? `:${position.house}` : ""}`
    ],
    heading: section.heading,
    body: section.body
  }));
}

function normalizeNatalPlacementSurface(
  position: PlanetPosition,
  natalSky: SkySnapshot | null,
  ownerContext?: ChartOwnerContext
): NormalizedNatalPlacementArticle {
  const isAnglePoint = isChartAnglePoint(position.planet);
  const sourceGroundedSections = isAnglePoint
    ? natalAngleFallbackV3NormalizedSections(position, ownerContext)
    : sourceGroundedNatalPlacementNormalizedSections(position, natalSky);
  const fallbackSections = isAnglePoint
    ? []
    : sourceGroundedNatalPlacementFallbackSections(position);
  const primarySections = isAnglePoint
    ? sourceGroundedSections
    : (["sign", "house"] as const)
        .map((slot) => (
          sourceGroundedSections.find((section) => section.slot === slot)
          ?? fallbackSections.find((section) => section.slot === slot)
        ))
        .filter((section): section is NormalizedNatalPlacementSection => Boolean(section));
  const sections = primarySections.length > 0
    ? [
        ...primarySections,
        ...sourceGroundedNatalAspectSectionsForPlacement(position, natalSky, ownerContext)
      ]
    : placementScaffoldNormalizedSections(position, natalSky);
  const selectedReaderSections = sections.filter((section) => section.slot !== "aspect");
  const hasSourceGroundedPrimarySection = selectedReaderSections.some((section) => section.layer === "authored");

  return {
    surface: "natal-placement",
    status: sections.length > 0 ? (hasSourceGroundedPrimarySection ? "servable" : "partial") : "not-servable",
    sections
  };
}

function normalizedNatalPlacementArticleSections(article: NormalizedNatalPlacementArticle): YouTransitArticle["sections"] {
  return article.sections.map((section) => ({
    heading: section.heading,
    tldr: contentSourceQaTag(section),
    body: section.body,
    role: section.slot === "aspect" ? "aspect" : "main",
    aspectType: section.aspectType,
    group: section.group,
    sourceTag: contentSourceQaTag(section),
    sourceKeys: section.sourceKeys
  }));
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
  ownerContext?: ChartOwnerContext;
  position: PlanetPosition;
}) {
  void generatedContent;
  void liveWriteup;
  return normalizedNatalPlacementArticleSections(
    normalizeNatalPlacementSurface(position, natalSky, ownerContext)
  );
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
      meaning: ""
    };
  });
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
  return natalCardTagline(planet);
}

function natalPlacementRouteId(position: PlanetPosition) {
  return [
    normalizeContentIdPart(position.planet),
    normalizeContentIdPart(position.sign),
    position.house ? `${position.house}h` : "house-pending"
  ].join("-");
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
  ownerContext?: ChartOwnerContext
): YouTransitArticle {
  const sections = natalPlacementModularSections({
    generatedContent,
    liveWriteup,
    natalSky,
    ownerContext,
    position
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
    relatedAspects: undefined,
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
  ownerContext?: ChartOwnerContext
): SkyDetail {
  const article = natalPlacementDetailArticle(position, natalSky, liveWriteup, generatedContent, onOpenNatalAspect, ownerContext);
  const isFallbackArchitectureV3Section = (section: YouTransitArticle["sections"][number]) => (
    section.sourceKeys?.includes("tldrastro-fallback-architecture-v3") ?? false
  );
  const ownerAwareCopy = (value: ReactNode) => {
    if (!ownerContext || typeof value !== "string") {
      return value;
    }

    return natalGeneratedCopyForOwner(value, ownerContext.ownerName, ownerContext.ownerKind ?? "person", ownerContext.ownerPronouns);
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
      sourceTag: section.sourceTag || section.tldr,
      role: section.role,
      aspectType: section.aspectType,
      group: section.group,
      sourceKeys: section.sourceKeys,
      body: isFallbackArchitectureV3Section(section)
        ? (typeof section.body === "string" ? cleanGeneratedSectionBody(section.body) : section.body)
        : ownerAwareCopy(typeof section.body === "string" ? cleanGeneratedSectionBody(section.body) : section.body)
    })),
    relatedAspects: article.relatedAspects
  };
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

function formatRetrogradeDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

function formatRetrogradeDateRange(start: string, end: string) {
  return `${formatRetrogradeDate(start)} - ${formatRetrogradeDate(end)}`;
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

function retrogradeSummaryCaption(
  retrogrades: PlanetPosition[],
  personal: PlanetPosition[],
  generatedContent: GeneratedContentMap
) {
  void generatedContent;
  const fastestPlanet = personal[0] ?? retrogrades[0];

  if (!fastestPlanet) {
    return "";
  }

  return retrogradeSummaryFallback(retrogrades, personal);
}

function retrogradePlacementTitle(position: PlanetPosition) {
  return `${skyDisplayPlanetName(position.planet)} Rx in ${position.sign}`;
}

function retrogradeRangeText(position: PlanetPosition) {
  if (!position.retrogradeStart || !position.retrogradeEnd) {
    return null;
  }

  return formatRetrogradeDateRange(position.retrogradeStart, position.retrogradeEnd);
}

function formatSignChapter(sign: string, signTransitEndDate?: string | null) {
  return signTransitEndDate ? `${sign} chapter until ${formatRetrogradeDate(signTransitEndDate)}` : null;
}

function activeRetrogradePositions(positions: PlanetPosition[]) {
  return positions.filter((position) => position.motion === "retrograde");
}

function retrogradeTimelineLines(position: PlanetPosition) {
  if (!position.retrogradeStart || !position.retrogradeEnd) {
    return [];
  }

  const label = position.retrogradeWindowSource === "sign-transit"
    ? `${position.sign} chapter`
    : "Retrograde";

  return [`${label}: ${formatRetrogradeDateRange(position.retrogradeStart, position.retrogradeEnd)}`];
}

function signChapterEndLabel(position: PlanetPosition) {
  return formatSignChapter(position.sign, position.transitEnd);
}

function compactRetrogradeTiming(position: PlanetPosition) {
  return retrogradeRangeText(position);
}

function retrogradeRemainingCountLabel(generatedAt: string, position: PlanetPosition) {
  const count = formatRetrogradeCountChip(generatedAt, position.retrogradeEnd ?? undefined);

  return count ? `${count} left` : null;
}

function currentSkyRetrogradeDetailData(
  position: PlanetPosition,
  generatedAt: string,
  generatedContent: GeneratedContentMap
) {
  void generatedContent;
  const durationLine = formatRetrogradeDuration(position.retrogradeStart ?? undefined, position.retrogradeEnd ?? undefined);
  const durationDescription = position.retrogradeStart && position.retrogradeEnd
    ? formatDurationLong(position.retrogradeStart, position.retrogradeEnd, "Retrograde")
    : null;
  const timelineLines = retrogradeTimelineLines(position);
  const retrogradeTiming = compactRetrogradeTiming(position);
  let renderedHeadline = "";
  let packageBodyParagraphs: string[] = [];

  try {
    const rendered = transitSynastryFallbackRendererV3.renderTransitRetro({
      format: "article",
      planet: normalizeContentIdPart(position.planet),
      sign: normalizeContentIdPart(position.sign),
      window: retrogradeRemainingCountLabel(generatedAt, position) ?? retrogradeTiming
    });
    renderedHeadline = rendered.headline;
    packageBodyParagraphs = readerFacingParagraphs(rendered.parts);
  } catch (error) {
    if (!(error instanceof FallbackV3SourceGapError)) {
      throw error;
    }
  }

  const tldr = firstSentences(packageBodyParagraphs[0] ?? "", 1);
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
    ...packageBodyParagraphs
  ];

  return {
    blurb: firstSentences(packageBodyParagraphs[0] ?? "", 2),
    detail: {
      routePath: skyRetrogradeRoutePath(position),
      glyph: `${position.glyph} ℞`,
      kicker: retrogradeDetailKicker(position),
      title: renderedHeadline || retrogradePlacementTitle(position),
      meta: [formatPlacementPosition(position).toUpperCase(), retrogradeTiming].filter(Boolean).join(" · "),
      duration: retrogradeTiming ?? undefined,
      subtitle: tldr,
      retrograde: true,
      plainBody: true,
      suppressTldr: true,
      body: detailParagraphs,
      sections: [],
      astrologyDrilldown: null
    } satisfies SkyDetail
  };
}

function primaryPlacementDurationLabel(position: PlanetPosition, generatedAt: string) {
  if (position.motion === "retrograde" && position.retrogradeEnd) {
    return formatCountdown(generatedAt, position.retrogradeEnd);
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
  const retrogrades = activeRetrogradePositions(positions);
  const [showOuterRetrogrades, setShowOuterRetrogrades] = useState(false);

  if (retrogrades.length === 0) {
    return null;
  }

  const personalRetrogrades = retrogrades.filter((position) => isPersonalRetrogradePlanet(position.planet));
  const outerRetrogrades = retrogrades.filter((position) => !isPersonalRetrogradePlanet(position.planet));
  const showSummary = retrogrades.length >= 3;
  const eyebrow = retrogrades.length === 1 ? "Retrograde" : "Retrogrades";
  const summaryCaption = showSummary
    ? retrogradeSummaryCaption(retrogrades, personalRetrogrades, generatedContent)
    : "";
  const outerRetrogradeLabel = readableNameList(outerRetrogrades.map(retrogradeCollapsedName));

  const buildRetrogradeDetail = (position: PlanetPosition) => {
    const detailData = currentSkyRetrogradeDetailData(position, generatedAt, generatedContent);

    return {
      blurb: detailData.blurb,
      count: formatRetrogradeDuration(position.retrogradeStart ?? undefined, position.retrogradeEnd ?? undefined),
      detail: detailData.detail,
      remainingCount: retrogradeRemainingCountLabel(generatedAt, position),
      range: retrogradeRangeText(position)
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
    const title = `${skyDisplayPlanetName(position.planet)} Rx in ${position.sign}`;

    return (
      <PlanetPlacementRow
        ariaLabel={`Read more about ${retrogradePlacementTitle(position)}`}
        degree={formatPlanetDegree(position)}
        description={!compact ? row.blurb : null}
        durationLabel={row.remainingCount}
        glyph={position.glyph}
        onClick={() => onOpenDetail(row.detail)}
        pointName={position.planet}
        rangeLabel={row.range}
        retrograde={position.motion === "retrograde"}
        statuses={[{ label: "Retrograde", tone: "retrograde" }]}
        title={title}
        variant="sky"
      />
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
          {summaryCaption ? <p className="ro-sum-cap">{summaryCaption}</p> : null}
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
                      : outerRetrogradeLabel}
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
            const normalized = normalizeSkyAspectSurface(aspect, generatedContent, positions, generatedAt);

            if (normalized.sections.length === 0) {
              return null;
            }

            const displaySummary = stripSkyAspectTimingPrefix(
              normalizedSurfacePreview(normalized),
              timing
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
                      <span className="aspect-row-timing" aria-label={timing.label}>
                        <span className="ui-pill ui-pill--neutral ui-pill--mixed planet-placement-row__duration">
                          <DurationLabelText label={timing.durationLabel} />
                        </span>
                        <span>{timing.rangeLabel}</span>
                      </span>
                      {displaySummary ? <p>{displaySummary}</p> : null}
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
          const statuses = placementStatuses(position);
          const isRetrograde = position.motion === "retrograde";
          const durationLabel = primaryPlacementDurationLabel(position, generatedAt);
          const retrogradeDurationLabel = null;
          const transitRangeLabel = isRetrograde
            ? retrogradeRangeText(position)
            : placementTransitRangeLabel(position, generatedAt);
          const rowSummary = normalizedSurfacePreview(
            normalizeSkyPlacementSurface(
              position,
              transitRangeLabel,
              generatedContent,
              skyPlacementWritingBeats({
                aspects,
                generatedAt,
                planet: position.planet,
                positions: displayPositions
              })
            )
          );
          const openDetail = () => onOpenDetail(currentSkyPlacementDetailArticle({
            aspects,
            generatedAt,
            generatedContent,
            onOpenDetail,
            position,
            positions
          }));

          return (
            <SkyPlacementListItem id={position.planet} key={position.planet}>
              <PlanetPlacementRow
                ariaLabel={`Read more about ${title}`}
                degree={formatPlanetDegree(position)}
                description={rowSummary}
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

function CalculationDiagnosticsPanel({
  generatedContent,
  hydrationState,
  sky
}: {
  generatedContent: GeneratedContentMap;
  hydrationState: "snapshot" | "hydrated";
  sky: SkySnapshot;
}) {
  const diagnosticsEnabled = String(import.meta.env.VITE_ASTRO_DIAGNOSTICS ?? "false").toLowerCase() === "true";

  if (!diagnosticsEnabled) {
    return null;
  }

  const facts = sky.facts ?? [];
  const validation = validateAstrologyFacts(facts);
  const mercuryFact = facts.find((fact) => fact.planetOrPointId === "mercury" && fact.kind === "position");
  const sampleContent = generatedContent.get("sky.retrograde.mercury.cancer.retrograde_passage")
    ?? generatedContent.get("sky.placement.sun.cancer")
    ?? null;
  const cacheAge = Date.now() - new Date(sky.generatedAt).getTime();

  return (
    <details className="calculation-diagnostics-panel">
      <summary>Calculation diagnostics</summary>
      <dl>
        <dt>Source</dt>
        <dd>{sky.calculationProvenance?.library ?? "unknown"} {sky.calculationProvenance?.libraryVersion ?? ""}</dd>
        <dt>Raw timestamp</dt>
        <dd>{sky.generatedAt}</dd>
        <dt>Normalized fact ID</dt>
        <dd>{mercuryFact?.id ?? facts[0]?.id ?? "none"}</dd>
        <dt>Content record ID</dt>
        <dd>{sampleContent?.id ?? "none"}</dd>
        <dt>Snapshot/live source</dt>
        <dd>{typeof sampleContent?.sourceSnapshot?.sourceType === "string" ? sampleContent.sourceSnapshot.sourceType : sampleContent?.provider ?? "none"}</dd>
        <dt>Hydration state</dt>
        <dd>{hydrationState}</dd>
        <dt>Cache age</dt>
        <dd>{Number.isFinite(cacheAge) ? `${Math.max(0, Math.round(cacheAge / 1000))}s` : "unknown"}</dd>
        <dt>Validation status</dt>
        <dd>{validation.ok ? "valid primary calculation" : validation.diagnostics.join("; ")}</dd>
      </dl>
    </details>
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
    <section className="transit-results" aria-label="Personalized transits">
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
          <span>Transits</span>
          <strong>{new Date(`${form.chartDate}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</strong>
        </div>
      </div>

      <div className="transit-lists">
        <TransitList title="Short-term themes" transits={shortTransits} selectedTransitId={selectedTransitId} setSelectedTransitId={setSelectedTransitId} />
        <TransitList title="Long-term themes" transits={longTransits} selectedTransitId={selectedTransitId} setSelectedTransitId={setSelectedTransitId} />
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
          {transit.direction === "applying" ? <ArrowUpRight size={18} /> : transit.direction === "separating" ? <ArrowDownRight size={18} /> : null}
        </button>
      ))}
    </section>
  );
}

function TransitDetail({ transit, form }: { transit: TransitItem; form: TransitForm }) {
  const normalized = normalizePersonalTransitSurface(transit, form.chartDate);
  const readSection = normalized.sections[0] ?? null;
  const readTitle = readSection?.heading ?? personalTransitDisplayTitle(transit);
  const readParagraphs = readSection
    ? splitSurfaceParagraphs(readSection.body, readSection.heading)
    : [];
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
  journalPromptsEnabled,
  generatedContent,
  onThemeChange,
  onSunriseOrbChange,
  onDyslexiaFontChange,
  onJournalPromptsChange,
  onHouseSignLabelStyleChange
}: {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  theme: UiTheme;
  sunriseOrbEnabled: boolean;
  dyslexiaFriendlyFont: boolean;
  journalPromptsEnabled: boolean;
  generatedContent: GeneratedContentMap;
  onThemeChange: (theme: UiTheme) => void;
  onSunriseOrbChange: (enabled: boolean) => void;
  onDyslexiaFontChange: (enabled: boolean) => void;
  onJournalPromptsChange: (enabled: boolean) => void;
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
              <div className="settings-row settings-row-control">
                <span className="settings-row__label">Journal prompts</span>
                <SwitchControl
                  checked={journalPromptsEnabled}
                  label="Toggle journal prompts"
                  onChange={onJournalPromptsChange}
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
                const title = option.label;
                const description = option.description;

                return (
                  <div className="settings-row" key={option.value}>
                    <div className="settings-row-copy">
                      <span className="settings-row-title">{title}</span>
                      <small className="settings-row-description">{description}</small>
                    </div>
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
                <span className="settings-row__value">Whole Sign</span>
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
  journalPromptsEnabled,
  onThemeChange,
  onSunriseOrbChange,
  onDyslexiaFontChange,
  onJournalPromptsChange,
  houseSignLabelStyle,
  onHouseSignLabelStyleChange
}: {
  theme: UiTheme;
  location: LocationInput;
  sunriseOrbEnabled: boolean;
  dyslexiaFriendlyFont: boolean;
  journalPromptsEnabled: boolean;
  onThemeChange: (theme: UiTheme) => void;
  onSunriseOrbChange: (enabled: boolean) => void;
  onDyslexiaFontChange: (enabled: boolean) => void;
  onJournalPromptsChange: (enabled: boolean) => void;
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
              <div className="settings-row settings-row-control">
                <span className="settings-row__label">Journal prompts</span>
                <SwitchControl
                  checked={journalPromptsEnabled}
                  label="Toggle journal prompts"
                  onChange={onJournalPromptsChange}
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
              <span className="settings-row__value">Whole Sign</span>
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
  currentSky,
  natalSky,
  natalAspectPatternLoadStatus,
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
  currentSky: SkySnapshot | null;
  natalSky: SkySnapshot | null;
  natalAspectPatternLoadStatus: "idle" | "loading" | "ready" | "unavailable";
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
  useContentRegistryRevision();
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
  const natalSun = natalPositions.find((position) => position.planet === "Sun");
  const natalMoon = natalPositions.find((position) => position.planet === "Moon");
  const natalAscendantPosition = typeof natalSky?.ascendantLongitude === "number"
    ? { ...positionFromLongitude({ planet: "Ascendant", glyph: "↑", longitude: natalSky.ascendantLongitude }), house: 0 }
    : null;
  const natalMidheavenBasePosition = typeof natalSky?.midheavenLongitude === "number"
    ? positionFromLongitude({ planet: "Midheaven", glyph: "MC", longitude: natalSky.midheavenLongitude })
    : null;
  const natalMidheavenPosition = natalMidheavenBasePosition
    ? {
        ...natalMidheavenBasePosition,
        house: natalSky?.ascendant ? wholeSignHouseForSign(natalMidheavenBasePosition.sign, natalSky.ascendant) ?? 0 : 0
      }
    : null;
  const natalListOrder = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Chiron", "Lilith", "North Node", "South Node", "Midheaven"];
  const planetRows = natalListOrder
    .map((planet) => {
      if (planet === "Midheaven") {
        return natalMidheavenPosition;
      }

      return natalPositions.find((position) => position.planet === planet);
    })
    .filter((position): position is PlanetPosition => Boolean(position));
  const natalAnglePositions = [natalAscendantPosition, natalMidheavenPosition].filter((position): position is PlanetPosition => Boolean(position));
  const routeableNatalPositions = [natalSun, natalMoon, ...natalAnglePositions, ...planetRows].filter((position): position is PlanetPosition => Boolean(position));
  const natalChartTableBaseRows = [natalAscendantPosition, ...natalPositions, natalMidheavenPosition]
    .filter((position): position is PlanetPosition => Boolean(position))
    .filter((position, index, positions) => positions.findIndex((candidate) => candidate.planet === position.planet) === index)
    .map(natalChartTableRowFromPosition);
  const natalChartTableRows = natalSky
    ? completeNatalChartTableRows(natalSky, natalChartTableBaseRows)
    : [];
  const chartSettings = normalizeChartSettings(profile.settings);
  const lifeAreaFocus = chartSettings.lifeAreaFocus;
  const houseSignLabelStyle = chartSettings.houseSignLabelStyle;
  const showNatalAspectPatterns = natalAspectPatternReaderEnabled();
  const occupiedNatalHouses = new Set(
    routeableNatalPositions
      .map((position) => position.house)
      .filter((house): house is number => typeof house === "number" && house >= 1 && house <= 12)
  );
  const emptyNatalHouses = Array.from({ length: 12 }, (_, index) => index + 1)
    .filter((house) => !occupiedNatalHouses.has(house));
  const natalAspectRows = uniqueNatalAspectRows(natalSky?.aspects ?? [])
    .slice()
    .sort((first, second) => first.orb - second.orb)
    .slice(0, 8);
  const natalAspectPatternItems = showNatalAspectPatterns
    ? natalAspectPatternReaderItems(natalSky)
    : [];
  const natalAspectPatternStatus = showNatalAspectPatterns
    ? natalAspectPatternReaderStatus(showNatalAspectPatterns, natalSky, !natalSky, natalAspectPatternLoadStatus)
    : undefined;
  const careerArchetypeProfile = resolveCareerArchetypeProfile(natalSky);
  const natalNorthNode = natalPositions.find((position) => /north\s*node|true\s*node/i.test(position.planet));
  const soulRoadmapProfile = resolveSoulRoadmapProfile({
    moon: displayMoon,
    northNode: natalNorthNode?.sign ?? "",
    rising: displayRising,
    risingPending: unknownBirthTime || displayRising === "Rising pending",
    sun: displaySun
  });
  const openCareerDetail = () => {
    if (careerArchetypeProfile) {
      setTransitArticle(careerYouArticle(careerArchetypeProfile));
    }
  };
  const openSoulRoadmapDetail = () => {
    if (soulRoadmapProfile) {
      setTransitArticle(soulRoadmapYouArticle(soulRoadmapProfile));
    }
  };
  const aspectRows = dedupeSameBeatPersonalTransits(
    rankTransitsByLifeAreaFocus(transitItems, lifeAreaFocus),
    transitForm.chartDate
  ).slice(0, 8);
  const natalAspectPatternTimingOverrides = activationTimingOverridesForTransits(natalAspectPatternItems, aspectRows, transitForm.chartDate);
  const updateTransitAspectLines = currentSky && natalSky
    ? transitWheelAspectLines(currentSky, natalSky, aspectRows)
    : [];
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
  const openNatalAspectArticle = (aspect: SkySnapshot["aspects"][number]) => {
    setActivePlacementRouteId(null);
    setTransitArticle(natalAspectDetailArticle(aspect, generatedContent));
    if (window.location.hash.startsWith("#you/placement/")) {
      window.history.pushState(null, "", "#you");
    }
  };
  const openPlacementArticle = (position: PlanetPosition, historyMode: "push" | "replace" = "push") => {
    const placementId = natalPlacementRouteId(position);

    setActivePlacementRouteId(placementId);
    setTransitArticle(natalPlacementDetailArticle(position, natalSky, null, generatedContent, openNatalAspectArticle));
    updatePlacementRouteUrl(placementId, historyMode);
  };
  useEffect(() => {
    function syncPlacementRoute() {
      const routeId = placementRouteIdFromUrl();
      const routePosition = placementPositionByRouteId(routeId);

      if (routePosition) {
        setActivePlacementRouteId(routeId);
        setTransitArticle(natalPlacementDetailArticle(routePosition, natalSky, null, generatedContent, openNatalAspectArticle));
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
  }, [activePlacementRouteId, generatedContent, natalSky, routeableNatalPositions.map(natalPlacementRouteId).join("|")]);
  const bigThreeRows = [
    <PlacementTableRow
      asButton={Boolean(natalSun)}
      degree={natalSun ? formatPlanetDegree(natalSun) : null}
      description={natalCardTagline("Sun")}
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
      asButton={Boolean(natalMoon)}
      degree={natalMoon ? formatPlanetDegree(natalMoon) : null}
      description={natalCardTagline("Moon")}
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
      asButton={Boolean(natalAscendantPosition)}
      degree={natalAscendantPosition ? formatPlanetDegree(natalAscendantPosition) : null}
      glyph="↑"
      house={natalAscendantPosition?.house || null}
      onClick={natalAscendantPosition ? () => openPlacementArticle(natalAscendantPosition) : undefined}
      pointName="Ascendant"
      title={displayRising && displayRising !== "Rising pending" ? `Ascendant in ${displayRising}` : displayRising || "Rising calculating"}
      description={natalCardTagline("Ascendant")}
      variant="natal"
      key="ascendant"
    />,
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
        asButton
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
    const rowSummary = normalizedSurfacePreview(normalizeNatalAspectSurface(aspect));

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
    const personalizedContentKey = personalTransitGeneratedContentKey(transit, transitForm.chartDate);
    const normalizedTransit = normalizePersonalTransitSurface(transit, transitForm.chartDate);
    const rowSummary = normalizedSurfacePreview(normalizedTransit);
    const isBackgroundUpdate = transit.significance === "low priority" || transitOrbValue(transit) >= 6;
    const timing = transitItemTimingDisplay(transit, transitForm.chartDate);
    const title = `${transit.transitPlanet} ${transit.aspect} your ${transit.natalPoint}`;
    const articleSections = normalizedTransit.sections.map((section) => ({
      heading: section.heading || title,
      tldr: "",
      body: taggedSectionBody(section)
    }));
    const openArticle = () => {
      setSelectedTransitId(transit.id);
      setActivePlacementRouteId(null);
      setTransitArticle({
        id: personalizedContentKey,
        title,
        glyph: pointGlyph(transit.transitPlanet),
        // The authored aspect package declares headline + body, not TLDR.
        // The collapsed-row preview must not be promoted into another slot.
        subtitle: "",
        summary: "",
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
  const standaloneHouseTransitRows = Array.from(
    new Map(
      aspectRows
        .filter((transit) => transit.natalHouse)
        .map((transit) => [`${transit.transitPlanet}-${transit.natalHouse}`, transit])
    ).values()
  ).slice(0, 4).flatMap((transit) => {
    const house = transit.natalHouse;

    if (!house) {
      return [];
    }

    const contentKey = transitHouseContentKey(transit.transitPlanet, house);
    const normalizedHouseTransit = normalizeTransitHouseSurface(transit, house, transitForm.chartDate);
    const rowSummary = normalizedSurfacePreview(normalizedHouseTransit);
    const title = `${transit.transitPlanet} through your ${ordinalHouse(house)} house`;
    const timingRange = transitHouseRangeLabel(transit, currentSky, transitForm.chartDate);
    const articleSections = normalizedHouseTransit.sections.map((section) => ({
      heading: section.heading,
      tldr: "",
      body: taggedSectionBody(section)
    }));
    const openArticle = () => {
      setSelectedTransitId(transit.id);
      setActivePlacementRouteId(null);
      setTransitArticle({
        id: contentKey,
        title,
        glyph: pointGlyph(transit.transitPlanet),
        // House cards do not currently author a TLDR slot. Keep their preview
        // copy on the updates row, but render the article from the authored
        // headline + body fields without promoting body copy into TLDR.
        subtitle: "",
        summary: "",
        sections: articleSections,
        meta: [
          ...(timingRange ? [{ label: "Date range", value: timingRange }] : []),
          { label: "House", value: `${ordinalHouse(house)} House` },
          { label: "Area", value: houseLifeAreas[house] ?? "" },
          { label: "Transit planet", value: transit.transitPlanet }
        ]
      });
    };

    return [(
      <button
        type="button"
        className="updates-aspect-row updates-aspect-row--house"
        key={contentKey}
        onClick={openArticle}
      >
        <span className="updates-aspect-row__glyphs" aria-hidden="true">
          <span className="planet-glyph">{pointGlyph(transit.transitPlanet)}</span>
        </span>
        <span className="updates-aspect-row__content">
          <span className="updates-aspect-row__title">{title}</span>
          <span className="updates-aspect-row__meta-line">
            <span className="ui-pill ui-pill--neutral ui-pill--mixed planet-placement-row__duration">
              {transit.term === "long" ? "Long-term" : "Short-term"}
            </span>
            {timingRange ? <span>{timingRange}</span> : null}
            <span>{houseLifeAreas[house] ?? "house topic"}</span>
          </span>
          {rowSummary ? <span className="updates-aspect-row__description">{rowSummary}</span> : null}
        </span>
        <span className="updates-aspect-row__meta" aria-label={`${ordinalHouse(house)} house`}>
          <span className="updates-aspect-row__dot" aria-hidden="true" />
          <span className="updates-aspect-row__orb">{house}</span>
        </span>
      </button>
    )];
  });
  const dailyTimingContent = personalTimingGenerated;
  const generatedDailyHeadline = dailyTimingContent?.headline?.trim();
  const generatedDailySummary = liveGeneratedSummaryIfPresent(dailyTimingContent);
  const normalizedDailyTiming = generatedDailySummary
    ? normalizeDailyTimingSurface(dailyTimingContent, generatedDailySummary)
    : { surface: "daily-timing" as const, status: "not-servable" as const, sections: [] };
  const generatedDailyWriteup = generatedDailySummary
    ? normalizedDailyTiming.sections.map((section) => {
        const tag = contentSourceQaTag(section);
        const body = splitGeneratedDailyBody(section.body);

        return {
          heading: "",
          body: tag && body.length > 0 ? [tag, ...body] : body
        };
      }).filter((section) => section.body.length > 0)
    : [];
  const dailyUpdateSummary = generatedDailyHeadline && generatedDailySummary
    ? {
        headline: generatedDailyHeadline,
        summary: generatedDailySummary,
        writeup: generatedDailyWriteup,
        keyFactors: [],
        status: "ready" as const
      }
    : personalTimingStatus === "loading" || personalTimingGeneratedStatus === "loading"
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
          aspectInspector
        />
      </div>
    </div>
  ) : null;
  const updatesChart = natalSky && currentSky ? (
    <div className="wheel natal-wheel chart-shell" id="wheel-updates-transits" aria-label="Transit chart wheel">
      <div className="chart-frame">
        <SkyWheel
          positions={natalSky.positions}
          aspects={[]}
          transitPositions={currentSky.positions}
          transitAspects={updateTransitAspectLines}
          ascendant={natalSky.ascendant}
          ascendantLongitude={natalSky.ascendantLongitude}
          midheavenLongitude={natalSky.midheavenLongitude}
          showHouses
          houseSignLabelStyle={houseSignLabelStyle}
          variant="natal"
          aspectInspector
        />
      </div>
    </div>
  ) : null;

  return (
    <Suspense fallback={<FeatureLoadingFallback />}>
      <YouPage
        bigThreeRows={bigThreeRows}
        careerArchetypeProfile={careerArchetypeProfile}
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
        natalAspectPatternItems={natalAspectPatternItems}
        natalAspectPatternTimingOverrides={natalAspectPatternTimingOverrides}
        natalAspectPatternStatus={natalAspectPatternStatus}
        natalChart={natalChart}
        natalChartPending={!natalSky}
        natalTableRows={natalChartTableRows}
        updatesChart={updatesChart}
        onCreateChart={onCreateChart}
        onOpenCareerDetail={careerArchetypeProfile ? openCareerDetail : undefined}
        onOpenSoulRoadmapDetail={soulRoadmapProfile ? openSoulRoadmapDetail : undefined}
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
        aspectRows={updateAspectRows}
        signatureBody={signatureBody}
        signatureTitle={signatureTitle}
        signaturesReady={signaturesReady}
        standaloneTransitRows={standaloneHouseTransitRows}
        unknownBirthTime={unknownBirthTime}
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
  chartRefreshKey,
  chartsReady,
  allowCachedChartsWhileLoading,
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
  chartRefreshKey: number;
  chartsReady: boolean;
  allowCachedChartsWhileLoading: boolean;
  onOpenDetail: (detail: SkyDetail) => void;
}) {
  const initialCachedCharts = useMemo(
    () => listCachedManualCharts([chartOwnerUserId, profile.id]),
    [chartOwnerUserId, profile.id]
  );
  const [charts, setCharts] = useState<ManualChart[]>(() => (
    allowCachedChartsWhileLoading ? initialCachedCharts : []
  ));
  const [form, setForm] = useState<ManualChartForm>(defaultManualChartForm);
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null);
  const [friendsMainView, setFriendsMainView] = useState<FriendsMainView>(() => initialFriendsTab());
  const [friendProfileTab, setFriendProfileTab] = useState<FriendProfileTab>("compatibility");
  const [friendNatalChartViewMode, setFriendNatalChartViewMode] = useState<NatalChartViewMode>("circle");
  const [relationshipChartFullscreenMode, setRelationshipChartFullscreenMode] = useState<RelationshipChartFullscreenMode | null>(null);
  const [relationshipComparisonChartId, setRelationshipComparisonChartId] = useState("self");
  const [relationshipComparisonPickerOpen, setRelationshipComparisonPickerOpen] = useState(false);
  const [relationshipCompare, setRelationshipCompare] = useState<RelationshipCompareResponse | null>(null);
  const [relationshipCompareStatus, setRelationshipCompareStatus] = useState<RelationshipCompareStatus>("idle");
  const [friendChartModalOpen, setFriendChartModalOpen] = useState(false);
  const [openChartMenuId, setOpenChartMenuId] = useState<string | null>(null);
  const [deleteCandidateChart, setDeleteCandidateChart] = useState<ManualChart | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "deleting">(
    () => allowCachedChartsWhileLoading && initialCachedCharts.length > 0 ? "idle" : "loading"
  );
  const [message, setMessage] = useState("");
  const chartsLoadedRef = useRef(false);
  const chartOwnerUserIdRef = useRef(chartOwnerUserId);
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
  const friendGeneratedContent = useMemo(
    () => mergeGeneratedContentMaps(natalGeneratedContent, relationshipGeneratedContent),
    [natalGeneratedContent, relationshipGeneratedContent]
  );
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
  const relationshipComparisonManualChart = relationshipComparisonChartId === "self"
    ? null
    : charts.find((chart) => chart.id === relationshipComparisonChartId) ?? null;
  const relationshipComparisonPronouns = relationshipComparisonManualChart?.pronouns ?? null;
  const selectedRelationshipContextType = relationshipComparisonIsSelf
    ? selectedChart?.relationshipType
    : "friend";
  const selectedRelationshipRomantic = selectedRelationshipContextType
    ? isExplicitRomanticRelationship(selectedRelationshipContextType)
    : false;
  const selectedSynastryContacts = selectedChart
    ? selectedChartIsEvent
      ? []
      : rankSynastryContactsByLifeAreaFocus(
        synastryContacts(
          relationshipComparisonSky,
          selectedChart,
          relationshipGeneratedContent,
          relationshipComparisonName,
          relationshipComparisonIsSelf,
          relationshipComparisonPronouns,
          selectedRelationshipRomantic,
          selectedRelationshipContextType
        ),
        lifeAreaFocus
      )
    : [];
  const selectedCompatibilityCards = selectedChart && !selectedChartIsEvent
    ? compatibilityPlanetCards(
        relationshipComparisonSky,
        selectedChart,
        relationshipGeneratedContent,
        selectedRelationshipContextType,
        relationshipComparisonName,
        relationshipComparisonIsSelf
      )
    : [];
  const selectedCompatibilityDynamics = compatibilityDynamicsFromContacts(
    selectedSynastryContacts,
    selectedChart?.displayName ?? "Friend",
    relationshipComparisonName,
    relationshipComparisonIsSelf,
    selectedChart?.pronouns,
    relationshipComparisonPronouns
  );
  const selectedSynastryAspectLines: InterChartAspectLine[] = selectedChart && !selectedChartIsEvent
    ? synastryWheelAspectLines(relationshipComparisonSky, selectedChart)
    : [];
  const selectedCompositeSky = selectedChart && !selectedChartIsEvent ? relationshipCompositeSky(relationshipComparisonSky, selectedChart) : null;
  const selectedFriendHasChartRail = friendProfileTab === "natal"
    ? Boolean(selectedChart?.natalChart)
    : friendProfileTab === "transits"
      ? Boolean(selectedChart?.natalChart)
    : selectedChartIsEvent
      ? false
      : friendProfileTab === "compatibility"
      ? Boolean(selectedChart?.natalChart && relationshipComparisonSky)
      : friendProfileTab === "synastry"
      ? Boolean(selectedChart?.natalChart && relationshipComparisonSky)
      : Boolean(selectedCompositeSky);
  const selectedFriendTransits = selectedChart && !selectedChartIsEvent
    ? dedupeSameBeatPersonalTransits(
      rankTransitsByLifeAreaFocus(rankedFriendTransits(currentSky, selectedChart, sunriseOrbDegrees), lifeAreaFocus),
      currentSky.generatedAt
    ).slice(0, 8)
    : [];
  const selectedFriendTransitAspectLines = selectedChart && !selectedChartIsEvent
    ? transitWheelAspectLines(currentSky, selectedChart.natalChart ?? null, selectedFriendTransits)
    : [];
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
        house: null,
        retrograde: false
      }
    ];
  const selectedFriendNatalPlacementRows = selectedChartIsEvent
    ? selectedFriendPlacementRows
    : selectedFriendPlacementRows.filter((row) => !isSocialBigThreeRow(row));
  const selectedFriendNatalTableBaseRows = selectedFriendPlacementRows.map(natalChartTableRowFromSocial);
  const selectedFriendNatalTableRows = selectedChart?.natalChart
    ? completeNatalChartTableRows(selectedChart.natalChart, selectedFriendNatalTableBaseRows)
    : [];
  const showFriendNatalAspectPatterns = natalAspectPatternReaderEnabled();
  const selectedFriendNatalAspectPatternItems = showFriendNatalAspectPatterns
    ? natalAspectPatternReaderItems(selectedChart?.natalChart ?? null)
    : [];
  const selectedFriendNatalAspectPatternTimingOverrides = activationTimingOverridesForTransits(
    selectedFriendNatalAspectPatternItems,
    selectedFriendTransits,
    currentSky.generatedAt
  );
  const selectedFriendNatalAspectPatternStatus = showFriendNatalAspectPatterns && selectedChart?.natalChart
    ? natalAspectPatternReaderStatus(
        showFriendNatalAspectPatterns,
        selectedChart.natalChart,
        false,
        selectedChart.natalChart.aspectPatterns?.resolvedCopy ? "ready" : "unavailable"
      )
    : undefined;
  const selectedFriendPronouns = selectedChart && !selectedChartIsEvent
    ? resolvePersonReference({
        name: selectedChart.displayName,
        pronouns: selectedChart.pronouns
      })
    : null;
  const selectedFriendCareerArchetypeProfile = selectedChart?.natalChart && !selectedChartIsEvent
    ? resolveCareerArchetypeProfile(selectedChart.natalChart, undefined, {
        ownerName: selectedChart.displayName,
        pronouns: selectedFriendPronouns
          ? {
              subject: selectedFriendPronouns.subject,
              object: selectedFriendPronouns.object,
              possessive: selectedFriendPronouns.possessiveAdjective,
              reflexive: selectedFriendPronouns.reflexive
            }
          : undefined
      })
    : null;
  const selectedFriendSoulRoadmapProfile = selectedChart && !selectedChartIsEvent
    ? resolveSoulRoadmapProfile({
        moon: selectedFriendBigThree?.moon ?? "",
        northNode: selectedChart.natalChart?.positions.find((position) => /north\s*node|true\s*node/i.test(position.planet))?.sign ?? "",
        ownerKind: "person",
        ownerName: selectedChart.displayName,
        ownerPronouns: selectedChart.pronouns,
        rising: selectedFriendBigThree?.rising ?? "",
        risingPending: selectedChart.birthTimeUnknown || selectedFriendBigThree?.rising === "Rising pending",
        sun: selectedFriendBigThree?.sun ?? ""
      })
    : null;
  const selectedFriendOccupiedHouses = new Set(
    (selectedChart?.natalChart?.positions ?? [])
      .filter((position) => ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"].includes(position.planet))
      .map((position) => position.house)
      .filter((house): house is number => typeof house === "number")
  );
  const selectedFriendEmptyHouses = selectedChart?.natalChart && !selectedChartIsEvent
    ? Array.from({ length: 12 }, (_, index) => index + 1).filter((house) => !selectedFriendOccupiedHouses.has(house))
    : [];
  const openFriendCompatibilityCardDetail = (card: CompatibilityPlanetCard, paragraphs: string[]) => {
    if (!selectedChart) {
      return;
    }

    onOpenDetail({
      routePath: friendDetailRoutePath(selectedChart.id, "compatibility", card.id),
      glyph: card.glyph,
      kicker: "Compatibility",
      title: `${card.planet} compatibility`,
      meta: `${card.comparisonLabel}: ${card.youSign} · ${card.friendName}: ${card.friendSign}`,
      subtitle: card.goDeeper.match,
      plainBody: true,
      suppressTldr: true,
      body: paragraphs
    });
  };
  const openFriendNatalAspectDetail = (aspect: SkySnapshot["aspects"][number]) => {
    const ownerName = selectedChart?.displayName ?? "This chart";
    const ownerKind = selectedChartIsEvent ? "chart" : "person";
    const article = natalAspectDetailArticle(aspect, friendGeneratedContent, {
      ownerName,
      ownerKind,
      ownerPronouns: selectedChart?.pronouns
    });

    onOpenDetail({
      routePath: selectedChart ? friendDetailRoutePath(
        selectedChart.id,
        friendProfileTab,
        `natal-aspect-${normalizeContentIdPart(aspect.from)}-${normalizeContentIdPart(aspect.type)}-${normalizeContentIdPart(aspect.to)}`
      ) : undefined,
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
        sourceTag: section.sourceTag || section.tldr,
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

    onOpenDetail({
      ...natalPlacementSkyDetail(
      position,
      selectedChart.natalChart,
      null,
      friendGeneratedContent,
      openFriendNatalAspectDetail,
      {
        ownerName: selectedChart.displayName,
        ownerKind: selectedChartIsEvent ? "chart" : "person",
        ownerPronouns: selectedChart.pronouns
      }
      ),
      routePath: friendDetailRoutePath(selectedChart.id, friendProfileTab, `natal-placement-${normalizeContentIdPart(position.planet)}`)
    });
  };
  const openFriendEmptyHouseDetail = (house: number) => {
    if (!selectedChart?.natalChart) {
      return;
    }

    const article = emptyHouseDetailArticle(
      house,
      selectedChart.natalChart,
      "friend",
      selectedChart.displayName,
      selectedChart.pronouns
    );

    onOpenDetail({
      routePath: friendDetailRoutePath(selectedChart.id, friendProfileTab, `empty-house-${house}`),
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
        sourceTag: section.sourceTag || section.tldr,
        body: typeof section.body === "string" ? cleanGeneratedSectionBody(section.body) : section.body
      }))
    });
  };
  function selectFriendsTab(nextTab: FriendsTab, historyMode: "push" | "replace" = "push") {
    storeFriendsTab(nextTab);
    setFriendsMainView(nextTab);
    setSelectedChartId(null);
    setFriendProfileTab("compatibility");
    setRelationshipChartFullscreenMode(null);
    setRelationshipComparisonChartId("self");
    setRelationshipComparisonPickerOpen(false);
    setOpenChartMenuId(null);
    updateFriendsTabUrl(nextTab, historyMode);
  }

  function applyFriendsRouteStateFromUrl() {
    const routeState = friendsRouteStateFromUrl();

    if (!routeState) {
      return false;
    }

    storeFriendsTab(routeState.tab);
    setOpenChartMenuId(null);
    setRelationshipComparisonPickerOpen(false);

    if (routeState.chartId) {
      setFriendsMainView("profile");
      setSelectedChartId(routeState.chartId);
      setFriendProfileTab(routeState.view);
      setRelationshipComparisonChartId("self");
    } else {
      setFriendsMainView(routeState.tab);
      setSelectedChartId(null);
      setFriendProfileTab("compatibility");
      setRelationshipComparisonChartId("self");
      setRelationshipChartFullscreenMode(null);
    }

    return true;
  }

  useEffect(() => {
    if (!applyFriendsRouteStateFromUrl()) {
      const nextTab = initialFriendsTab();
      storeFriendsTab(nextTab);
      setFriendsMainView(nextTab);
      setSelectedChartId(null);
      setFriendProfileTab("compatibility");
      setRelationshipChartFullscreenMode(null);
      setRelationshipComparisonChartId("self");
      setRelationshipComparisonPickerOpen(false);
      setOpenChartMenuId(null);
      updateFriendsTabUrl(nextTab, "replace");
    }
  }, [landingKey]);

  useEffect(() => {
    function handlePopState() {
      if (!applyFriendsRouteStateFromUrl()) {
        const nextTab = initialFriendsTab();
        storeFriendsTab(nextTab);
        setFriendsMainView(nextTab);
        setSelectedChartId(null);
        setFriendProfileTab("compatibility");
        setRelationshipChartFullscreenMode(null);
        setRelationshipComparisonPickerOpen(false);
        setOpenChartMenuId(null);
      }
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
    const shouldLoadRelationshipCompare = friendProfileTab === "synastry" || friendProfileTab === "composite";

    if (!shouldLoadRelationshipCompare || !isTldrAstroApiConfigured || !selectedChart || selectedChartIsEvent) {
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
      relationshipContext: relationshipContextFromRole(selectedRelationshipContextType),
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
    selectedRelationshipContextType,
    selectedChartIsEvent,
    relationshipComparisonChartId,
    relationshipComparisonManualChart?.id,
    relationshipComparisonManualChart?.birthDate,
    relationshipComparisonManualChart?.birthTime,
    relationshipComparisonManualChart?.birthTimeUnknown,
    relationshipComparisonManualChart?.birthLocation?.label,
    relationshipComparisonManualChart?.birthLocation?.timeZone,
    friendProfileTab,
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
    () => resolvedFriendsMainView === "circle"
      ? circleFeedPreviewCards(
          currentSky,
          charts,
          friendGeneratedContent,
          lifeAreaFocus,
          sunriseOrbDegrees,
          profileTransits
        )
      : [],
    [resolvedFriendsMainView, currentSky, charts, friendGeneratedContent, lifeAreaFocus, sunriseOrbDegrees, profileTransits]
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
    const chartOwnerChanged = chartOwnerUserIdRef.current !== chartOwnerUserId;

    if (chartOwnerChanged) {
      chartOwnerUserIdRef.current = chartOwnerUserId;
      chartsLoadedRef.current = false;
      setSelectedChartId(null);
    }

    if (!chartsReady) {
      const cachedCharts = listCachedManualCharts([
        chartOwnerUserId,
        profile.id,
        ...listLocalManualChartUserIds()
      ]);

      if (allowCachedChartsWhileLoading && cachedCharts.length > 0) {
        chartsLoadedRef.current = true;
        setCharts(cachedCharts);
        setStatus("idle");
      } else {
        setCharts([]);
        setStatus("loading");
      }

      return () => {
        cancelled = true;
      };
    }

    if (!chartsLoadedRef.current) {
      setStatus("loading");
    }
    listManualCharts(chartOwnerUserId)
      .then((nextCharts) => {
        if (!cancelled) {
          chartsLoadedRef.current = true;
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
          chartsLoadedRef.current = true;
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
  }, [allowCachedChartsWhileLoading, chartOwnerUserId, chartRefreshKey, chartsReady, profile.id]);

  useEffect(() => {
    if (!chartsReady || charts.length === 0) {
      return;
    }

    const chartsToRepair = charts.filter(manualChartNeedsNatalRepair);

    if (chartsToRepair.length === 0) {
      return;
    }

    let cancelled = false;

    Promise.allSettled(chartsToRepair.map(async (chart) => {
      const birthLocation = await resolvedManualChartBirthLocationForRepair(chart);
      if (!birthLocation) {
        return null;
      }

      if (chart.natalChart && chart.birthLocation.timeZone === birthLocation.timeZone) {
        return null;
      }

      const birthTimeForChart = twentyFourHourTimeToDisplay(chart.birthTime ?? "12:00");
      const natalChart = await getAstrodienstSky(
        birthLocation,
        zonedDateTimeToUtc(chart.birthDate, birthTimeForChart, birthLocation.timeZone)
      );
      const input: ManualChartInput = {
        chartType: chart.chartType,
        displayName: chart.displayName,
        firstName: chart.firstName ?? null,
        lastName: chart.lastName ?? null,
        pronouns: chart.pronouns,
        relationshipType: chart.chartType === "event" ? null : normalizeRelationshipContextKey(chart.relationshipType),
        birthDate: chart.birthDate,
        birthTime: chart.birthTime,
        birthTimeUnknown: chart.birthTimeUnknown,
        birthPlace: chart.birthPlace,
        birthLocation,
        natalChart,
        notes: chart.notes ?? null
      };

      return updateManualChart(chartOwnerUserId, chart.id, input);
    }))
      .then((results) => {
        if (cancelled) {
          return;
        }

        const repairedCharts = results
          .filter((result): result is PromiseFulfilledResult<ManualChart | null> => result.status === "fulfilled")
          .map((result) => result.value)
          .filter((chart): chart is ManualChart => Boolean(chart));

        if (repairedCharts.length === 0) {
          return;
        }

        setCharts((currentCharts) => {
          const repairedById = new Map(repairedCharts.map((chart) => [chart.id, chart]));

          return currentCharts
            .map((chart) => repairedById.get(chart.id) ?? chart)
            .sort((first, second) => first.displayName.localeCompare(second.displayName));
        });
      });

    return () => {
      cancelled = true;
    };
  }, [chartOwnerUserId, charts, chartsReady]);

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

  function requestDeleteChart(chart: ManualChart) {
    setOpenChartMenuId(null);
    setDeleteCandidateChart(chart);
  }

  function openFriendProfile(chart: ManualChart) {
    setOpenChartMenuId(null);
    setSelectedChartId(chart.id);
    setFriendProfileTab(chart.chartType === "event" ? "natal" : "compatibility");
    setRelationshipComparisonChartId("self");
    setRelationshipComparisonPickerOpen(false);
    setFriendsMainView("profile");
    updateFriendProfileUrl(chart.id, chart.chartType === "event" ? "natal" : "compatibility");
  }

  function changeFriendProfileTab(tab: FriendProfileTab) {
    setFriendProfileTab(tab);
    if (selectedChart) {
      updateFriendProfileUrl(selectedChart.id, tab);
    }
  }

  function updateField<Key extends keyof ManualChartForm>(key: Key, value: ManualChartForm[Key]) {
    setForm({ ...form, [key]: value });
  }

  function updateChartType(chartType: ManualChartType) {
    setForm((currentForm) => ({
      ...currentForm,
      chartType,
      pronouns: chartType === "event" ? defaultPronounChoice : currentForm.pronouns,
      relationshipType: chartType === "event" ? "friend" : normalizeRelationshipContextKey(currentForm.relationshipType)
    }));
  }

  async function saveManualChart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const displayName = form.displayName.trim();
    const birthDate = form.birthDate;
    const birthPlace = form.birthPlace.trim();
    const selectedBirthLocation = birthPlace && form.birthLocation?.label === birthPlace
      ? form.birthLocation
      : null;
    const birthLocation = selectedBirthLocation ? withTimeZone(selectedBirthLocation) : null;

    if (!displayName || !birthDate || !birthPlace || !birthLocation) {
      setMessage(!birthLocation && birthPlace ? "Choose a city from the birth place suggestions. If it is already selected, timezone lookup is unavailable." : formCopy.requiredMessage);
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
        pronouns: form.chartType === "event" ? defaultPronounChoice : form.pronouns,
        relationshipType: form.chartType === "event" ? null : normalizeRelationshipContextKey(form.relationshipType),
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
      setFriendProfileTab(savedChart.chartType === "event" ? "natal" : "compatibility");
      setRelationshipComparisonChartId("self");
      setRelationshipComparisonPickerOpen(false);
      updateFriendProfileUrl(savedChart.id, savedChart.chartType === "event" ? "natal" : "compatibility", "replace");
      resetForm(editingChartId ? "Chart updated." : "Chart created.");
      setFriendChartModalOpen(false);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : typeof error === "object" && error && "message" in error && typeof error.message === "string"
          ? error.message
          : "Could not save chart.";

      setMessage(message);
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
      setDeleteCandidateChart(null);
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
          onDeleteChart={requestDeleteChart}
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
      {deleteCandidateChart && (
        <ModalPortal
          className="friend-chart-delete-modal-root"
          panelClassName="chart-modal friend-chart-delete-modal add-chart-modal"
          titleId="friend-chart-delete-title"
          width="440px"
          onClose={() => {
            if (status !== "deleting") {
              setDeleteCandidateChart(null);
            }
          }}
        >
          <section className="manual-chart-form friend-chart-delete-form add-chart-form">
            <button
              className="chart-modal-close modal-close add-chart-modal__close"
              type="button"
              aria-label="Close"
              disabled={status === "deleting"}
              onClick={() => setDeleteCandidateChart(null)}
            >
              <X size={20} aria-hidden="true" />
            </button>
            <div className="manual-chart-form-heading friend-chart-modal-heading add-chart-modal__heading">
              <h2 id="friend-chart-delete-title">Delete {deleteCandidateChart.displayName}?</h2>
              <p className="add-chart-modal__subtitle">This removes the saved chart and cannot be undone.</p>
            </div>
            <div className="modal-actions friend-chart-delete-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={status === "deleting"}
                onClick={() => setDeleteCandidateChart(null)}
              >
                Cancel
              </button>
              <button
                className="manual-chart-save manual-chart-delete-confirm"
                type="button"
                disabled={status === "deleting"}
                onClick={() => void removeChart(deleteCandidateChart)}
              >
                {status === "deleting" ? "Deleting..." : "Delete chart"}
              </button>
            </div>
          </section>
        </ModalPortal>
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
              innerAscendant={relationshipComparisonSky.ascendant}
              innerAscendantLongitude={relationshipComparisonSky.ascendantLongitude}
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
                  <SegmentedControl
                    value={friendNatalChartViewMode}
                    options={[
                      { value: "circle", label: "Circle" },
                      { value: "table", label: "Table" }
                    ]}
                    onChange={setFriendNatalChartViewMode}
                    ariaLabel={`${selectedChart.displayName} natal chart display`}
                    className="natal-chart-view-toggle"
                    compact
                  />
                  {friendNatalChartViewMode === "table" ? (
                    <NatalChartDataTable
                      rows={selectedFriendNatalTableRows}
                      title={`${selectedChart.displayName} natal placement table`}
                    />
                  ) : (
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
                          aspectInspector
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              {friendProfileTab === "transits" && selectedChart.natalChart && (
                <div className="friend-synastry-wheel-shell">
                  <div className="chart-shell">
                    <div className="wheel natal-wheel friend-wheel chart-frame" aria-label={`${selectedChart.displayName} transit chart wheel`}>
                      <SkyWheel
                        positions={selectedChart.natalChart.positions}
                        aspects={[]}
                        transitPositions={currentSky.positions}
                        transitAspects={selectedFriendTransitAspectLines}
                        ascendant={selectedChart.natalChart.ascendant}
                        ascendantLongitude={selectedChart.natalChart.ascendantLongitude}
                        midheavenLongitude={selectedChart.natalChart.midheavenLongitude}
                        showHouses
                        houseSignLabelStyle={houseSignLabelStyle}
                        variant="natal"
                        aspectInspector
                      />
                    </div>
                  </div>
                </div>
              )}
              {friendProfileTab === "compatibility" && selectedChart.natalChart && relationshipComparisonSky && (
                <div className="friend-synastry-wheel-shell">
                  <div className="chart-shell">
                    <div className="wheel natal-wheel friend-wheel chart-frame" aria-label={`${selectedChart.displayName} compatibility chart wheel`}>
                      <SynastryWheel
                        outerPositions={selectedChart.natalChart.positions}
                        innerPositions={relationshipComparisonSky?.positions ?? []}
                        interAspects={selectedSynastryAspectLines}
                        ascendant={selectedChart.natalChart.ascendant}
                        ascendantLongitude={selectedChart.natalChart.ascendantLongitude}
                        midheavenLongitude={selectedChart.natalChart.midheavenLongitude}
                        innerAscendant={relationshipComparisonSky.ascendant}
                        innerAscendantLongitude={relationshipComparisonSky.ascendantLongitude}
                        houseSignLabelStyle={houseSignLabelStyle}
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
                        innerAscendant={relationshipComparisonSky.ascendant}
                        innerAscendantLongitude={relationshipComparisonSky.ascendantLongitude}
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
          onTabChange={changeFriendProfileTab}
          rising={selectedFriendBigThree?.rising ?? "Rising pending"}
          sun={selectedFriendBigThree?.sun ?? "Pending"}
          tabs={selectedChartIsEvent
            ? [
              { value: "natal", label: "Natal" }
            ]
            : [
              { value: "compatibility", label: "Compatibility" },
              { value: "transits", label: "Transits" },
              { value: "natal", label: "Natal" },
              { value: "synastry", label: "Synastry" },
              { value: "composite", label: "Composite" }
            ]}
        >

          {friendProfileTab === "compatibility" && (
            selectedCompatibilityCards.length > 0 ? (
              <CompatibilityTab
                cards={selectedCompatibilityCards}
                dynamics={selectedCompatibilityDynamics}
                friendName={selectedChart.displayName}
                onOpenCard={openFriendCompatibilityCardDetail}
              />
            ) : (
              <div className="friend-tab-pane friend-compat-stage friend-compatibility-stage" aria-label={`${selectedChart.displayName} compatibility`}>
                <div className="friend-profile-copy-column compatibility-column">
                  <article className="friends-logic-card">
                    <span>Compatibility</span>
                    <h3>Add both birth charts.</h3>
                    <p>Compatibility appears when {relationshipComparisonIsSelf ? "your chart" : `${possessiveLabel(relationshipComparisonName)} chart`} and {possessiveLabel(selectedChart.displayName)} chart are both available. The comparison uses planets and signs without a score.</p>
                  </article>
                </div>
              </div>
            )
          )}

          {friendProfileTab === "natal" && (
            <div className="friend-tab-pane friend-compat-stage friend-natal-stage" aria-label="Natal">
              <div className="friend-profile-copy-column">
                <SoulRoadmapCard
                  className="friend-soul-roadmap-card"
                  moon={selectedFriendBigThree?.moon ?? ""}
                  onOpenDetail={selectedFriendSoulRoadmapProfile ? () => onOpenDetail(soulRoadmapSkyDetail(
                    selectedFriendSoulRoadmapProfile,
                    friendDetailRoutePath(selectedChart.id, friendProfileTab, "soul-roadmap")
                  )) : undefined}
                  ownerKind={selectedChartIsEvent ? "chart" : "person"}
                  ownerName={selectedChart.displayName}
                  ownerPronouns={selectedChart.pronouns}
                  rising={selectedFriendBigThree?.rising ?? ""}
                  risingPending={selectedChart.birthTimeUnknown || selectedFriendBigThree?.rising === "Rising pending"}
                  sun={selectedFriendBigThree?.sun ?? ""}
                />
                {selectedFriendCareerArchetypeProfile && selectedFriendCareerArchetypeProfile.sections.length > 0 && (
                  <CareerArchetypeCard
                    labelClassName="section-label friend-section-label"
                    onOpenDetail={() => onOpenDetail(careerSkyDetail(
                      selectedFriendCareerArchetypeProfile,
                      friendDetailRoutePath(selectedChart.id, friendProfileTab, "career")
                    ))}
                    profile={selectedFriendCareerArchetypeProfile}
                  />
                )}
                {selectedFriendNatalAspectPatternStatus && (
                  <NatalAspectPatternsSection
                    items={selectedFriendNatalAspectPatternItems}
                    status={selectedFriendNatalAspectPatternStatus}
                  />
                )}
                <span className="eyebrow section-label friend-section-label">Big three</span>
                <div className="list you-aspects-list aspect-row-list friend-aspect-list friend-big-three-list" aria-label={`${selectedChart.displayName} big three`}>
                  {selectedFriendBigThreeDisplayRows.map((row) => {
                    const title = row.label === "Ascendant"
                      ? `Ascendant in ${row.sign}`
                      : placementTitleFromParts(row.label, row.sign, row.retrograde);
                    const body = selectedChart.birthTimeUnknown && row.label === "Ascendant"
                      ? ""
                      : placementRowDescription(row.label, "person", selectedChart.displayName);
                    const canOpenDetail = Boolean(selectedChart.natalChart && !row.sign.toLowerCase().includes("pending"));

                    return (
                      <PlacementTableRow
                        asButton={canOpenDetail}
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
                                asButton
                                description={emptyHouseCardDescription(
                                  house,
                                  friendNatalChart,
                                  "friend",
                                  selectedChart.displayName,
                                  selectedChart.pronouns
                                )}
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
                      {uniqueNatalAspectRows(selectedChart.natalChart.aspects).map((aspect) => {
                        const rowSummary = normalizedSurfacePreview(normalizeNatalAspectSurface(aspect, {
                          ownerName: selectedChart.displayName,
                          ownerKind: selectedChartIsEvent ? "chart" : "person",
                          ownerPronouns: selectedChart.pronouns
                        }));

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

          {friendProfileTab === "transits" && (
            <div className="friend-tab-pane friend-compat-stage friend-transits-stage friend-transits-stage--full" aria-label={`${selectedChart.displayName} transits`}>
              <div className="friend-profile-copy-column">
                <NatalAspectPatternActivationsSection
                  items={selectedFriendNatalAspectPatternItems}
                  timingOverrides={selectedFriendNatalAspectPatternTimingOverrides}
                />
                {(["short", "long"] as const).map((durationClass) => {
                  const durationTransits = selectedFriendTransits.filter((transit) => transit.term === durationClass);

                  if (durationTransits.length === 0) {
                    return null;
                  }

                  return (
                    <section
                      className="friend-transit-group"
                      aria-label={durationClass === "short" ? "Short-term themes" : "Long-term themes"}
                      key={durationClass}
                    >
                      <span className="eyebrow section-label friend-section-label">
                        {durationClass === "short" ? "Short-term themes" : "Long-term themes"}
                      </span>
                      <div className="updates-aspect-list friend-transit-list">
                        {durationTransits.map((transit) => {
                          const summary = friendTransitSummary(
                            transit,
                            relationshipGeneratedContent,
                            selectedChart.displayName,
                            selectedChart.pronouns,
                            currentSky.generatedAt
                          );
                          const factLine = friendTransitFactLine(transit, selectedChart.displayName);
                          const timing = transitItemTimingDisplay(transit, currentSky.generatedAt);

                          return (
                            <article className="updates-aspect-row friend-transit-row" key={transit.id}>
                              <span className="updates-aspect-row__content">
                                <h3 className="updates-aspect-row__title">{transit.transitPlanet} {transitAspectTechnicalVerb(transit.aspect)} {transit.natalPoint}</h3>
                                <span className="updates-aspect-row__meta-line" aria-label={timing.label}>
                                  <span className="ui-pill ui-pill--neutral ui-pill--mixed planet-placement-row__duration">
                                    <DurationLabelText label={timing.durationLabel} />
                                  </span>
                                  <span>{timing.rangeLabel}</span>
                                </span>
                                <p className="updates-aspect-row__description">{summary}</p>
                                <span className="updates-aspect-row__detail">
                                  <span>Duration: {timing.label}</span>
                                  <span>{transit.transitPlanet} in the current sky</span>
                                  <span>{factLine}</span>
                                  <span>{transit.direction ?? "active"} · orb {transit.orb}</span>
                                </span>
                              </span>
                              <span className="updates-aspect-row__meta" aria-label={`${timing.label}, ${transit.orb} orb`}>
                                <span className="updates-aspect-row__dot" aria-hidden="true" />
                                <span className="updates-aspect-row__orb">{transit.orb}</span>
                              </span>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
                {selectedFriendTransits.length === 0 && (
                  <article className="friends-logic-card">
                    <span>Transits</span>
                    <h3>No prioritized transits are active.</h3>
                    <p>The sky is still moving, but no prioritized personalized transit is active for {selectedChart.displayName} in this window.</p>
                  </article>
                )}
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
                    const titleSlots = synastryTemplateSlots(
                      selectedChart.displayName,
                      contact.friendPoint.name,
                      contact.aspect,
                      relationshipComparisonName,
                      contact.yourPoint.name,
                      "friend",
                      {
                        personAPronouns: selectedChart.pronouns,
                        personBPronouns: relationshipComparisonPronouns,
                        personBIsReader: relationshipComparisonIsSelf
                      }
                    );
                    const title = relationshipAspectTitleFromSlots(titleSlots);
                    const subtitle = relationshipThemeTitle(contact.friendPoint.name, contact.yourPoint.name, contact.aspect);
                    const detailParagraphs = synastryDetailCopy(
                      selectedChart.displayName,
                      relationshipComparisonName,
                      relationshipComparisonIsSelf,
                      contact,
                      relationshipGeneratedContent,
                      selectedChart.pronouns,
                      relationshipComparisonPronouns,
                      selectedRelationshipRomantic,
                      selectedChart.relationshipType
                    ).filter(Boolean);
                    const description = contact.summary || textPreview(detailParagraphs.join("\n\n"));
                    const detailBody = detailParagraphs.length > 0
                      ? detailParagraphs
                      : [];

                    return (
                      <button
                        type="button"
                        className="aspect-row aspect-row-button friend-aspect-row"
                        key={contact.id}
                        aria-label={`Open full entry for ${title}`}
                        onClick={() => onOpenDetail({
                          routePath: friendDetailRoutePath(selectedChart.id, friendProfileTab, `synastry-${contact.id}`),
                          glyph: `${pointGlyph(contact.friendPoint.name)} ${aspectGlyph(contact.aspect)} ${pointGlyph(contact.yourPoint.name)}`,
                          kicker: "Synastry",
                          title,
                          meta: `${subtitle.toUpperCase()} · ${wholeDegreeOrb(contact.orb)}`,
                          body: detailBody,
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
                          <p>{compositeAspectSummary(aspect, selectedChart.displayName, relationshipComparisonName, relationshipComparisonIsSelf, relationshipGeneratedContent, selectedChart.relationshipType)}</p>
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
