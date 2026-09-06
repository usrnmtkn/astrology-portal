import { X } from "lucide-react";
import {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode
} from "react";
import type {
  ChartOwnerContext,
  GeneratedContentMap,
  LifeAreaFocus,
  SynastryContact,
  TransitItem,
  UserProfile,
  YouTransitArticle,
  friendsViewModelDependencies
} from "../../App";
import { ModalPortal } from "../../components/ModalPortal";
import { profileInitials } from "../../components/ProfileAvatar";
import { CitySearchField } from "../../components/CitySearchField";
import {
  friendPlacementDescription,
  socialPlacementRows,
  type SocialPlacementRow
} from "../../components/charts/PlacementRows";
import {
  completeNatalChartTableRows,
  natalChartTableRowFromSocial
} from "../../components/charts/natalChartTableRows";
import { aspectGlyph, pointGlyph } from "../../components/charts/chartAssets";
import type { InterChartAspectLine } from "../../components/charts/Wheels";
import {
  fallbackV3ApprovalLevelForContentKey,
  normalizeAspect as normalizeFallbackV3Aspect,
  SourceGapError as FallbackV3SourceGapError,
  transitSynastryFallbackRendererV3
} from "../../content/fallbackArchitectureV3Runtime";
import {
  fullDetailReaderFacingCopy,
  isReaderFacingCopy
} from "../../content/readerSafety";
import { isDisplayRetrograde } from "../../services/astrologyDisplay";
import { natalChartHasCompletePlacements } from "../../services/natalChartCompleteness";
import {
  selectPairDailyDriver,
  stablePairDailyVariant
} from "../../services/pairDaily";
import {
  calculatedSynastryContacts,
  relationshipCompositeSky,
  samePlanetExactAspect,
  selectDailyGlanceDriverPool,
  synastryWheelAspectLines,
  wholeSignHouseForSign,
  zodiacSignGlyphs
} from "../../services/chartMath";
import { groupAspectsByGiftLesson } from "../../services/aspectGiftLesson";
import { transitHouseContentKey } from "../../services/generatedContentKeys";
import type { LiveGeneratedContent } from "../../services/generatedContent";
import {
  manualChartNeedsNatalRepair,
  type ManualChart
} from "../../services/manualCharts";
import {
  isSocialFriendChart,
  socialFriendToChart,
  type ConnectedSocialFriend
} from "../../services/socialFriends";
import {
  natalAspectPatternReaderEnabled,
  natalAspectPatternReaderItems,
  natalAspectPatternReaderStatus,
  type NatalAspectPatternReaderItem
} from "../../services/natalAspectPatterns";
import {
  isExplicitRomanticRelationship,
  normalizeRelationshipContextKey
} from "../../services/relationshipContext";
import {
  acceptedOwnerApprovedTransitBody,
  acceptedOwnerApprovedTransitSections
} from "./transitDetailApproval";
import type { PronounChoice } from "../../services/personReferences";
import {
  contactsForBondTransitGroup,
  dedupeBondTransitEndpointCandidates,
  groupBondTransitActivations,
  rankBondTransitGroups
} from "../../services/bondTransitGrouping";
import {
  apiSettingsFromChartSettings,
  apiSubjectFromUserChart
} from "../../services/chartProfile";
import type { PlanetPosition, SkySnapshot } from "../../types";
import {
  cleanGeneratedSectionBody,
  cleanGeneratedSectionHeading
} from "../../utils/articleText";
import type { RelationshipChartFullscreenMode } from "./RelationshipChartFullscreen";
import type { FriendNatalChartViewMode } from "./FriendNatalViewControl";
import type {
  CompatibilityDynamic,
  CompatibilityPlanetCard
} from "./CompatibilityTab";
import type { FriendCompositeAspectGroup } from "./FriendCompositeTab";
import type { FriendSynastryAspectGroup } from "./FriendSynastryTab";
import type { FriendNatalEmptyHouseRow } from "./FriendNatalTab";
import type {
  FriendBondTransitView,
  FriendDailyForecastView,
  FriendHouseTransitView,
  FriendPersonalTransitGroup
} from "./FriendTransitsTab";
import {
  friendDetailRoutePath,
  friendsRouteStateFromUrl,
  initialFriendsTab,
  storeFriendsTab,
  updateFriendProfileUrl,
  updateFriendsTabUrl,
  type FriendProfileTab,
  type FriendsMainView,
  type FriendsTab
} from "./friendsRouting";
import { friendProfileWorkForTab } from "./friendProfileWork";
import {
  activeFriendProfileContentRequest,
  friendCalculationReadiness,
  idleFriendCalculationReadiness,
  type FriendCalculationReadiness
} from "./friendCalculationReadiness";
import {
  apiSubjectFromManualChart,
  buildFriendChartListItems,
  buildRelationshipComparisonOptions,
  isSocialBigThreeRow,
  manualChartBigThree,
  planetPositionFromSocialRow
} from "./friendChartModel";
import { useManualChartsController } from "./useManualChartsController";
import { useRelationshipCompare } from "./useRelationshipCompare";
import { resolvedNatalAspectPatternSectionLabel } from "../you/natalAspectPatternLabels";
import type { SkyDetail } from "../sky/SkyDetailArticle";
import { wholeDegreeOrb } from "../sky/skyHelpers";
import { friendDetailHasReaderFacingContent } from "./friendDetailAvailability";
import { selectEligibleFriendTransits } from "./friendTransitEligibility";
import { rankFriendHouseTransitActivations } from "./friendHouseTransitPriority";
import { scheduleFriendChartRepair } from "./friendChartLoading";

const FriendsWorkspaceShell = lazy(() =>
  import("./FriendsWorkspaceShell").then((module) => ({
    default: module.FriendsWorkspaceShell
  }))
);

const loadFriendCompositeTab = () =>
  import("./FriendCompositeTab").then((module) => ({
    default: module.FriendCompositeTab
  }));
const FriendCompositeTab = lazy(loadFriendCompositeTab);

const FriendChartModal = lazy(() =>
  import("./FriendChartModal").then((module) => ({
    default: module.FriendChartModal
  }))
);

const loadFriendDetailModule = () => import("./FriendDetail");
const loadFriendDetail = () =>
  loadFriendDetailModule().then((module) => ({
    default: module.FriendDetail
  }));
const FriendDetail = lazy(loadFriendDetail);

const loadFriendNatalTab = () =>
  import("./FriendNatalTab").then((module) => ({
    default: module.FriendNatalTab
  }));
const FriendNatalTab = lazy(loadFriendNatalTab);

const loadFriendTransitsTab = () =>
  import("./FriendTransitsTab").then((module) => ({
    default: module.FriendTransitsTab
  }));
const FriendTransitsTab = lazy(loadFriendTransitsTab);

const FriendProfileChartRail = lazy(() =>
  loadFriendDetailModule().then((module) => ({
    default: module.FriendProfileChartRail
  }))
);

const loadFriendSynastryTab = () =>
  import("./FriendSynastryTab").then((module) => ({
    default: module.FriendSynastryTab
  }));
const FriendSynastryTab = lazy(loadFriendSynastryTab);

const loadCompatibilityTab = () =>
  import("./CompatibilityTab").then((module) => ({
    default: module.CompatibilityTab
  }));
const CompatibilityTab = lazy(loadCompatibilityTab);

export function preloadFriendProfileComponents(tab: FriendProfileTab) {
  void loadFriendDetail();

  if (tab === "compatibility") void loadCompatibilityTab();
  if (tab === "transits") void loadFriendTransitsTab();
  if (tab === "natal") void loadFriendNatalTab();
  if (tab === "synastry") void loadFriendSynastryTab();
  if (tab === "composite") void loadFriendCompositeTab();
}

const FriendProfileChartFullscreen = lazy(() =>
  import("./RelationshipChartFullscreen").then((module) => ({
    default: module.FriendProfileChartFullscreen
  }))
);

function FeatureLoadingFallback() {
  return <div className="feature-loading-fallback" aria-hidden="true" />;
}

export function ManualChartsPanel({
  profile,
  profileHandle,
  currentSky,
  currentSkyLoading,
  transitDateLabel,
  fallbackArchitectureV3Version,
  profileNatalSky,
  profileNatalCalculationStatus,
  profileTransits,
  natalGeneratedContent,
  relationshipGeneratedContent,
  landingKey,
  sunriseOrbDegrees,
  chartOwnerUserId,
  chartRefreshKey,
  chartsReady,
  allowCachedChartsWhileLoading,
  onPendingRequestCountChange,
  onCalculationReadinessChange,
  onFriendProfileContentRequest,
  onOpenDetail,
  viewModel
}: {
  profile: UserProfile;
  profileHandle: string | null;
  currentSky: SkySnapshot | null;
  currentSkyLoading: boolean;
  transitDateLabel: string;
  fallbackArchitectureV3Version: number;
  profileNatalSky: SkySnapshot | null;
  profileNatalCalculationStatus: "idle" | "loading" | "ready" | "error";
  profileTransits: TransitItem[];
  natalGeneratedContent: GeneratedContentMap;
  relationshipGeneratedContent: GeneratedContentMap;
  landingKey: number;
  sunriseOrbDegrees: number;
  chartOwnerUserId: string;
  chartRefreshKey: number;
  chartsReady: boolean;
  allowCachedChartsWhileLoading: boolean;
  onPendingRequestCountChange: (count: number) => void;
  onCalculationReadinessChange: (readiness: FriendCalculationReadiness) => void;
  onFriendProfileContentRequest: (tab: FriendProfileTab) => void;
  onOpenDetail: (detail: SkyDetail) => void;
  viewModel: typeof friendsViewModelDependencies;
}) {
  const {
    activationTimingOverridesForTransits,
    bondEffectFamily,
    compatibilityDynamicHeading,
    compatibilityPlanets,
    createNatalGeneratedCopyForOwnerConverter,
    currentSkyHouseActivations,
    dailyGlanceDriver,
    dailyTransitQualifies,
    dateFromInput,
    dedupeSameBeatPersonalTransits,
    emptyContentFallback,
    emptyHouseCardDescription,
    emptyHouseDetailArticle,
    emptyHouseTitle,
    friendTransitSummary,
    genericPersonReferenceSlots,
    houseLifeAreaKeywords,
    houseLifeAreas,
    lifeAreaFocusScore,
    longTransitPlanets,
    mergeGeneratedContentMaps,
    natalAspectDetailArticle,
    natalAspectPatternActivationCopyForOwner,
    natalAspectPatternCopyForOwner,
    natalGeneratedCopyForOwner,
    natalPlacementDetailArticle,
    normalizeChartSettings,
    normalizeCompositeAspectSurface,
    normalizeCompositePlacementSurface,
    normalizeContentIdPart,
    normalizePersonalTransitSurface,
    normalizeTransitHouseSurface,
    normalizedSurfacePreview,
    ordinalHouse,
    ownerDisplayPronouns,
    pairDailyAspectGroups,
    personalTransitPackageWindow,
    placementTransitDurationLabel,
    placementTransitRangeLabel,
    possessiveLabel,
    rankTransitsByLifeAreaFocus,
    rankedFriendTransits,
    relationshipComparisonPossessive,
    relationshipFocusText,
    relationshipGeneratedCopyForPerspective,
    relationshipThemeTitle,
    renderReaderDirectedSynastryContact,
    repairRelationshipFallbackGrammar,
    repairSingularOwnerVerbAgreement,
    signAtWholeSignHouse,
    stableTransitCopyVariant,
    synastryContactContentKeys,
    textPreview,
    transitAspectTechnicalVerb,
    transitBodyWithoutRepeatedWindow,
    transitCardPreview,
    transitHouseAspectEvents,
    transitItemTimingDisplay,
    transitOrbValue,
    transitWheelAspectLines
  } = viewModel;

  function pairDailyDriver(
    currentSky: SkySnapshot,
    natalSky: SkySnapshot,
    variant: number,
    birthTimeUnknown = false
  ) {
    const moon = currentSky.positions.find((position) => position.planet === "Moon");

    if (!moon || typeof moon.longitude !== "number") {
      return null;
    }

    const house = !birthTimeUnknown && natalSky.ascendant
      ? wholeSignHouseForSign(moon.sign, natalSky.ascendant)
      : null;
    const drivers = selectDailyGlanceDriverPool(
      moon.longitude,
      natalSky.positions,
      house,
      5,
      3
    ).map((driver) => driver.kind === "aspect"
      ? { ...driver, natal: normalizeContentIdPart(driver.natal) }
      : driver);

    return selectPairDailyDriver(drivers, variant);
  }

  function pairDailyClauseKey(driver: NonNullable<ReturnType<typeof dailyGlanceDriver>>) {
    if (driver.kind === "house") {
      return `fallback-hook/pair-daily/clause/house/${driver.house}`;
    }

    const group = pairDailyAspectGroups[driver.aspect] ?? driver.aspect;
    return `fallback-hook/pair-daily/clause/${group}/${driver.natal}`;
  }

  function pairDailyMoonElement(sign: string): "fire" | "earth" | "air" | "water" | null {
    const normalized = normalizeContentIdPart(sign);

    if (["aries", "leo", "sagittarius"].includes(normalized)) return "fire";
    if (["taurus", "virgo", "capricorn"].includes(normalized)) return "earth";
    if (["gemini", "libra", "aquarius"].includes(normalized)) return "air";
    if (["cancer", "scorpio", "pisces"].includes(normalized)) return "water";
    return null;
  }

  function friendDailyGlance(
    currentSky: SkySnapshot,
    natalSky: SkySnapshot,
    ownerName: string,
    ownerPreferredName?: string | null,
    ownerPronouns?: PronounChoice | null,
    birthTimeUnknown = false,
    userId?: string | null
  ): FriendDailyForecastView | null {
    const driver = dailyGlanceDriver(currentSky, natalSky, birthTimeUnknown);
    const moon = currentSky.positions.find((position) => position.planet === "Moon") ?? null;

    if (!driver || !moon) return null;

    const moonHouse = !birthTimeUnknown && natalSky.ascendant
      ? wholeSignHouseForSign(moon.sign, natalSky.ascendant)
      : null;
    const moonContext: FriendDailyForecastView["moonContext"] = {
      sign: moon.sign,
      houseLabel: moonHouse ? `${ordinalHouse(moonHouse)} house` : null,
      topic: moonHouse ? houseLifeAreas[moonHouse] || null : null
    };

    // Follow-up after Friends daily parity ships: author 2–3 approved variants per
    // driver and select one deterministically from chart id + date + driver.

    try {
      const dateKey = currentSky.generatedAt.slice(0, 10);
      const reference = ownerDisplayPronouns(ownerName, ownerPronouns);
      const preferredName = ownerPreferredName?.trim()
        || ownerName.trim().split(/\s+/u)[0]
        || ownerName;
      const personSlots = {
        ...genericPersonReferenceSlots(reference),
        personPreferredName: preferredName,
        personPreferredNamePossessive: possessiveLabel(preferredName)
      };
      const rendered = driver.kind === "aspect"
        ? transitSynastryFallbackRendererV3.renderDailyGlance({
            natal: driver.natal,
            aspect: driver.aspect,
            dateKey,
            userId,
            voice: "they",
            personSlots
          })
        : transitSynastryFallbackRendererV3.renderDailyGlance({
            house: driver.house,
            dateKey,
            userId,
            voice: "they",
            personSlots
          });

      return {
        headline: rendered.headline ?? "",
        body: rendered.body ?? "",
        moonContext
      };
    } catch (error) {
      if (!(error instanceof FallbackV3SourceGapError)) {
        throw error;
      }
      console.warn("Friend Daily At-a-Glance source gap; hiding surface.", {
        ownerName,
        driver,
        error
      });
      return null;
    }
  }

  function formatPairDailyDate(value: string) {
    const date = dateFromInput(value);
    const weekday = date.toLocaleDateString("en-US", {
      weekday: "short"
    });
    const monthAndDay = date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric"
    });

    return `${weekday}., ${monthAndDay}`;
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

  function friendDailyDoDont(
    currentSky: SkySnapshot,
    natalSky: SkySnapshot,
    transits: TransitItem[]
  ) {
    const seededNatalPoints = new Set(["moon", "venus", "mars", "mercury", "saturn"]);
    const transit = transits
      .filter(dailyTransitQualifies)
      .filter((candidate) => seededNatalPoints.has(normalizeContentIdPart(candidate.natalPoint)))
      .sort((first, second) => transitOrbValue(first) - transitOrbValue(second))[0];

    if (!transit) {
      return null;
    }

    const natalPoint = normalizeContentIdPart(transit.natalPoint);
    const natalPosition = natalSky.positions.find(
      (position) => normalizeContentIdPart(position.planet) === natalPoint
    );
    const house = natalPosition?.house ?? transit.natalHouse ?? null;
    const natalSign = normalizeContentIdPart(natalPosition?.sign ?? transit.natalSign);
    const moon = currentSky.positions.find((position) => position.planet === "Moon") ?? null;
    const moonHouse = moon && natalSky.ascendant
      ? wholeSignHouseForSign(moon.sign, natalSky.ascendant)
      : null;

    if (!house || !natalSign) {
      return null;
    }

    try {
      const targetDate = currentSky.generatedAt.slice(0, 10);
      const rendered = transitSynastryFallbackRendererV3.renderDoDont({
        voice: "they",
        planet: natalPoint,
        sign: natalSign,
        house,
        transiting: normalizeContentIdPart(transit.transitPlanet),
        moonSign: moon ? normalizeContentIdPart(moon.sign) : null,
        moonHouse,
        dayKey: Number.isFinite(Date.parse(`${targetDate}T00:00:00Z`))
          ? Math.floor(Date.parse(`${targetDate}T00:00:00Z`) / 86400000)
          : 0
      });

      return rendered.do.length === 3 && rendered.dont.length === 3 ? rendered : null;
    } catch (error) {
      if (!(error instanceof FallbackV3SourceGapError)) {
        throw error;
      }

      console.warn("Friend daily Do/Don't source gap; hiding surface.", {
        transitId: transit.id,
        error
      });
      return null;
    }
  }

  function activeBondTransitCards(
    contacts: SynastryContact[],
    friendTransits: TransitItem[],
    readerTransits: TransitItem[],
    friendName: string,
    friendPronouns: PronounChoice | null | undefined,
    generatedAt: string
  ) {
    const rawCandidates = contacts.flatMap((contact) => {
      const activations = [
        ...readerTransits.map((transit) => ({
          transit,
          endpointOwner: "reader" as const,
          endpointPlanet: contact.yourPoint.name,
          counterpartPlanet: contact.friendPoint.name
        })),
        ...friendTransits.map((transit) => ({
          transit,
          endpointOwner: "friend" as const,
          endpointPlanet: contact.friendPoint.name,
          counterpartPlanet: contact.yourPoint.name
        }))
      ].filter(({ transit, endpointPlanet }) => (
        normalizeContentIdPart(transit.natalPoint) === normalizeContentIdPart(endpointPlanet)
        && Math.min(...transit.arc) <= 1
      ));

      return activations.flatMap(({
        transit: activation,
        endpointOwner,
        endpointPlanet,
        counterpartPlanet
      }) => {
        const activationAspect = normalizeFallbackV3Aspect(activation.aspect);
        const transiting = normalizeContentIdPart(activation.transitPlanet);

        if (!activationAspect || !normalizeFallbackV3Aspect(contact.aspect)) {
          return [];
        }

        // Walker canon: Lilith contacts render on conjunction and opposition only.
        if (transiting === "lilith" && activationAspect !== "conjunction" && activationAspect !== "opposition") {
          return [];
        }

        return [{
          activation,
          activationId: activation.id,
          aspect: activationAspect,
          contactId: contact.id,
          counterpartPlanet,
          endpointOwner,
          endpointPlanet,
          transiting
        }];
      });
    });
    const candidates = dedupeBondTransitEndpointCandidates(
      rawCandidates,
      (activation) => transitOrbValue(activation)
    );
    const groups = rankBondTransitGroups(
      groupBondTransitActivations(candidates),
      (activation) => transitOrbValue(activation)
    );

    // First card per transiting planet + exact aspect keeps the exact row; later cards
    // rotate to the family lane via duplicateIndex so no two cards on one view repeat the
    // same effect paragraph. Legacy soft/hard fallback rows keep their deterministic
    // rotation for nodes, Lilith, and missing exact units.
    const groupCounts = new Map<string, number>();
    const exactAspectCounts = new Map<string, number>();
    const friendPossessivePronoun = ownerDisplayPronouns(friendName, friendPronouns).possessiveAdjective;

    return groups.flatMap((group) => {
      const familyKey = `${group.transiting}:${bondEffectFamily(group.transiting, group.aspect)}`;
      const indexInGroup = groupCounts.get(familyKey) ?? 0;
      groupCounts.set(familyKey, indexInGroup + 1);
      const exactAspectKey = `${group.transiting}:${group.aspect}`;
      const duplicateIndex = exactAspectCounts.get(exactAspectKey) ?? 0;
      exactAspectCounts.set(exactAspectKey, duplicateIndex + 1);
      const baseVariant = (stableTransitCopyVariant(friendName, familyKey) ?? 1) - 1;
      const variantSlot = ((baseVariant + indexInGroup) % 3) + 1;
      const timingRange = personalTransitPackageWindow(group.activation, generatedAt);

      try {
        const rendered = transitSynastryFallbackRendererV3.renderBondTransit({
          transiting: group.transiting,
          aspect: group.aspect,
          endpointPlanet: group.endpointPlanet,
          endpointOwner: group.endpointOwner,
          activatedPlanets: group.activatedPlanets,
          otherName: friendName,
          friendPossessivePronoun,
          sign: group.activation.transitSign
            ? normalizeContentIdPart(group.activation.transitSign)
            : undefined,
          variant: variantSlot === 1 ? undefined : variantSlot,
          duplicateIndex,
          window: timingRange
        });

        return [{
          activatedContacts: contactsForBondTransitGroup(group, contacts),
          id: `${group.key}-${group.activationId}`,
          effectFamily: bondEffectFamily(group.transiting, group.aspect) as "soft" | "hard",
          effectContentKey: rendered.contentKey,
          headline: rendered.headline,
          transitPlanet: group.activation.transitPlanet,
          transitSign: group.activation.transitSign ?? "",
          timingRange,
          body: fullDetailReaderFacingCopy(rendered.parts) ?? "",
          effectBody: rendered.parts[0] ?? "",
          activationBody: fullDetailReaderFacingCopy(rendered.parts.slice(1)) ?? ""
        }];
      } catch (error) {
        if (error instanceof FallbackV3SourceGapError) {
          return [];
        }
        throw error;
      }
    }).slice(0, 3);
  }

  function natalAspectPatternReaderItemsForOwner(
    snapshot: SkySnapshot | null,
    ownerName: string,
    ownerKind: "person" | "chart",
    ownerPronouns?: PronounChoice | null
  ) {
    return natalAspectPatternReaderItems(snapshot).map((item) => ({
      ...item,
      copy: natalAspectPatternCopyForOwner(item.copy, ownerName, ownerKind, ownerPronouns),
      activationCopy: item.activationCopy
        ? natalAspectPatternActivationCopyForOwner(item.activationCopy, ownerName, ownerKind, ownerPronouns)
        : undefined
    }));
  }

  function synastryContacts(
    profileNatalSky: SkySnapshot | null,
    chart: ManualChart,
    relationshipType?: string | null
  ): SynastryContact[] {
    return calculatedSynastryContacts(profileNatalSky, chart).map((contact) => {
      const baseContact = {
        ...contact,
        contentKeys: synastryContactContentKeys(contact.friendPoint.name, contact.aspect, contact.yourPoint.name, relationshipType)
      };

      return {
        ...baseContact,
        // Visible Synastry and Compatibility cards render the approved article
        // directly below. Avoid resolving the same fallback package once here
        // and then a second time for the card users actually see.
        summary: ""
      };
    });
  }

  function compatibilityPlanetCards(
    profileNatalSky: SkySnapshot | null,
    chart: ManualChart,
    _generatedContent?: GeneratedContentMap,
    relationshipType?: string | null,
    comparisonName = "You",
    comparisonIsSelf = true
  ): CompatibilityPlanetCard[] {
    const friendSky = chart.natalChart;

    if ((!profileNatalSky && !comparisonIsSelf) || !friendSky) {
      return [];
    }

    return compatibilityPlanets.flatMap((planet) => {
      const yourPosition = profileNatalSky?.positions.find((position) => position.planet === planet);
      const friendPosition = friendSky.positions.find((position) => position.planet === planet);
      const cachedProfileSign = comparisonIsSelf
        ? planet === "Sun"
          ? profile.sun
          : planet === "Moon"
            ? profile.moon
            : null
        : null;
      const yourSign = yourPosition?.sign || cachedProfileSign;

      if (!yourSign || !friendPosition) {
        return [];
      }

      const exactAspect = yourPosition ? samePlanetExactAspect(yourPosition, friendPosition) : null;
      const hasExactAspect = Boolean(exactAspect);
      const comparisonLabel = comparisonIsSelf ? "You" : comparisonName;
      const comparisonPossessive = relationshipComparisonPossessive(comparisonName, comparisonIsSelf);
      let rendered: ReturnType<typeof transitSynastryFallbackRendererV3.renderCompat>;

      try {
        rendered = transitSynastryFallbackRendererV3.renderCompat({
          planet: normalizeContentIdPart(planet),
          signA: normalizeContentIdPart(yourSign),
          signB: normalizeContentIdPart(friendPosition.sign),
          otherName: chart.displayName
        });
      } catch (error) {
        if (error instanceof FallbackV3SourceGapError) {
          return [];
        }

        throw error;
      }

      const body = rendered.body.trim();

      if (!body || !isReaderFacingCopy(body)) {
        return [];
      }

      const sameSign = yourSign === friendPosition.sign;
      const relationship = sameSign ? "same-sign" : "sign-pair";
      const match = rendered.tag?.trim() || (sameSign ? "Same sign" : `${yourSign} + ${friendPosition.sign}`);
      const sourceKey = rendered.contentKey ?? rendered.templateKey;
      const contentTrace = `source=${sourceKey};template=${rendered.templateKey};route=friends.compatibility;planet=${normalizeContentIdPart(planet)};signA=${normalizeContentIdPart(yourSign)};signB=${normalizeContentIdPart(friendPosition.sign)};context=${normalizeRelationshipContextKey(relationshipType)}`;

      return [{
        id: `compatibility-${normalizeContentIdPart(planet)}`,
        glyph: yourPosition?.glyph || pointGlyph(planet),
        planet,
        comparisonLabel,
        youSign: yourSign,
        friendName: chart.displayName,
        friendSign: friendPosition.sign,
        goDeeper: {
          glyph: yourPosition?.glyph || pointGlyph(planet),
          match,
          body,
          function: "",
          yourLine: "",
          theirLine: "",
          sameSign,
          sameSignLine: "",
          verdict: "",
          relationship,
          contentTrace
        },
        exactAspectLabel: hasExactAspect && exactAspect
          ? `${comparisonPossessive} ${planet} ${exactAspect.type} their ${planet} · orb ${wholeDegreeOrb(exactAspect.orbValue)}`
          : undefined,
        contentTrace
      }];
    });
  }

  function compatibilityDynamicsFromContacts(
    contacts: SynastryContact[],
    friendName: string,
    comparisonName: string,
    comparisonIsSelf: boolean,
    friendPronouns?: PronounChoice | null,
    comparisonPronouns?: PronounChoice | null
  ): CompatibilityDynamic[] {
    void comparisonName;
    void comparisonIsSelf;
    void friendPronouns;
    void comparisonPronouns;

    return contacts.map((contact) => {
      const rendered = renderReaderDirectedSynastryContact(contact, friendName);

      return {
        id: `compatibility-dynamic-${contact.id}`,
        heading: compatibilityDynamicHeading(contact.aspect),
        glyphs: `${contact.yourPoint.glyph} ${aspectGlyph(contact.aspect)} ${contact.friendPoint.glyph}`,
        title: rendered?.headline ?? `${contact.yourPoint.name} ${contact.aspect} ${contact.friendPoint.name}`,
        summary: rendered?.body ?? contact.summary,
        meta: rendered?.tag ?? wholeDegreeOrb(contact.orb)
      };
    });
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
      retrograde: isDisplayRetrograde(position),
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

  const friendRouteDetailRefreshKeyRef = useRef("");
  const [socialFriends, setSocialFriends] = useState<ConnectedSocialFriend[]>([]);
  const socialFriendCharts = useMemo(
    () => socialFriends.map(socialFriendToChart),
    [socialFriends]
  );
  const showFriendNatalAspectPatterns = natalAspectPatternReaderEnabled();
  const {
    charts,
    editingChartId,
    form,
    formCopy,
    message,
    selectedChartId,
    setForm,
    setSelectedChartId,
    status,
    addBirthTime: prepareBirthTimeEdit,
    editChart: prepareChartEdit,
    removeChart: deleteStoredChart,
    resetForm,
    saveChart,
    updateChartType,
    updateField
  } = useManualChartsController({
    allowCachedChartsWhileLoading,
    chartOwnerUserId,
    chartRefreshKey,
    chartsReady,
    profileId: profile.id,
    showNatalAspectPatterns: showFriendNatalAspectPatterns,
    socialFriendCharts
  });
  const [friendsMainView, setFriendsMainView] = useState<FriendsMainView>(() => initialFriendsTab());
  const [friendProfileTab, setFriendProfileTab] = useState<FriendProfileTab>("compatibility");
  const [friendNatalChartViewMode, setFriendNatalChartViewMode] = useState<FriendNatalChartViewMode>("circle");
  const [relationshipChartFullscreenMode, setRelationshipChartFullscreenMode] = useState<RelationshipChartFullscreenMode | null>(null);
  const [relationshipComparisonChartId, setRelationshipComparisonChartId] = useState("self");
  const [relationshipComparisonPickerOpen, setRelationshipComparisonPickerOpen] = useState(false);
  const [friendChartModalOpen, setFriendChartModalOpen] = useState(false);
  const [openChartMenuId, setOpenChartMenuId] = useState<string | null>(null);
  const [deleteCandidateChart, setDeleteCandidateChart] = useState<ManualChart | null>(null);
  const allFriendCharts = useMemo(
    () => [...socialFriendCharts, ...charts],
    [charts, socialFriendCharts]
  );
  const editingChart = charts.find((chart) => chart.id === editingChartId) ?? null;
  const selectedChart = allFriendCharts.find((chart) => chart.id === selectedChartId) ?? null;
  const selectedFriendNatalChartComplete = selectedChart
    ? natalChartHasCompletePlacements(selectedChart.natalChart, selectedChart.birthTimeUnknown)
    : false;
  const selectedFriendReadyNatalChart = selectedFriendNatalChartComplete
    ? selectedChart?.natalChart ?? null
    : null;
  const selectedFriendNatalChartRepairing = Boolean(
    selectedChart
      && !selectedFriendNatalChartComplete
      && manualChartNeedsNatalRepair(selectedChart)
  );
  const selectedSocialFriend = selectedChart
    ? socialFriends.find((friend) => socialFriendToChart(friend).id === selectedChart.id) ?? null
    : null;
  const isEventForm = form.chartType === "event";
  const selectedChartIsEvent = selectedChart?.chartType === "event";
  const resolvedFriendsMainView = friendsMainView === "profile" && !selectedChart ? "charts" : friendsMainView;

  useEffect(() => {
    onCalculationReadinessChange(friendCalculationReadiness({
      activeTab: friendProfileTab,
      isEventChart: Boolean(selectedChartIsEvent),
      profileActive: resolvedFriendsMainView === "profile" && Boolean(selectedChart)
    }));

    return () => {
      onCalculationReadinessChange(idleFriendCalculationReadiness);
    };
  }, [
    friendProfileTab,
    onCalculationReadinessChange,
    resolvedFriendsMainView,
    selectedChart?.id,
    selectedChartIsEvent
  ]);

  useEffect(() => {
    const profileActive = resolvedFriendsMainView === "profile" && Boolean(selectedChart);

    if (profileActive || !chartsReady || allFriendCharts.length === 0) {
      return undefined;
    }
    if (profileNatalSky) {
      onCalculationReadinessChange(idleFriendCalculationReadiness);
      return undefined;
    }

    return scheduleFriendChartRepair(() => {
      onCalculationReadinessChange({ currentSky: false, profileNatal: true });
    });
  }, [
    allFriendCharts.length,
    chartsReady,
    onCalculationReadinessChange,
    profileNatalSky,
    resolvedFriendsMainView,
    selectedChart?.id
  ]);
  const chartSettings = useMemo(() => normalizeChartSettings(profile.settings), [profile.settings]);
  const lifeAreaFocus = chartSettings.lifeAreaFocus;
  const houseSignLabelStyle = chartSettings.houseSignLabelStyle;
  const friendGeneratedContent = useMemo(
    () => mergeGeneratedContentMaps(natalGeneratedContent, relationshipGeneratedContent),
    [natalGeneratedContent, relationshipGeneratedContent]
  );
  const selectedFriendBigThree = selectedChart && selectedFriendReadyNatalChart
    ? manualChartBigThree(selectedChart)
    : null;
  const relationshipComparisonOptions = useMemo(() => buildRelationshipComparisonOptions({
    allFriendCharts,
    profileEmail: profile.email,
    profileName: profile.name,
    profileNatalSky,
    selectedChartId: selectedChart?.id ?? null
  }), [allFriendCharts, profile.email, profile.name, profileNatalSky, selectedChart?.id]);
  const selectedRelationshipComparison = relationshipComparisonOptions.find((option) => option.id === relationshipComparisonChartId) ?? relationshipComparisonOptions[0];
  const relationshipComparisonSky = selectedRelationshipComparison?.natalChart ?? null;
  const relationshipComparisonName = selectedRelationshipComparison?.displayName ?? "You";
  const relationshipComparisonIsSelf = selectedRelationshipComparison?.isSelf ?? true;
  const relationshipComparisonManualChart = relationshipComparisonChartId === "self"
    ? null
    : allFriendCharts.find((chart) => chart.id === relationshipComparisonChartId) ?? null;
  const relationshipComparisonPronouns = relationshipComparisonManualChart?.pronouns ?? null;
  const selectedRelationshipContextType = relationshipComparisonIsSelf
    ? selectedChart?.relationshipType
    : "friend";
  const selectedRelationshipRomantic = selectedRelationshipContextType
    ? isExplicitRomanticRelationship(selectedRelationshipContextType)
    : false;
  const relationshipApiSettings = useMemo(
    () => apiSettingsFromChartSettings(profile.settings),
    [profile.settings]
  );
  const relationshipPersonA = useMemo(
    () => apiSubjectFromManualChart(selectedChart, relationshipApiSettings),
    [relationshipApiSettings, selectedChart]
  );
  const relationshipPersonB = useMemo(
    () => relationshipComparisonChartId === "self"
      ? apiSubjectFromUserChart(profile, profile.charts[0], profile.settings)
      : apiSubjectFromManualChart(relationshipComparisonManualChart, relationshipApiSettings),
    [profile, relationshipApiSettings, relationshipComparisonChartId, relationshipComparisonManualChart]
  );
  const {
    response: relationshipCompare,
    status: relationshipCompareStatus
  } = useRelationshipCompare({
    enabled: friendProfileTab === "composite" && Boolean(selectedChart) && Boolean(selectedFriendReadyNatalChart) && !selectedChartIsEvent,
    personA: relationshipPersonA,
    personB: relationshipPersonB,
    relationshipType: selectedRelationshipContextType,
    settings: relationshipApiSettings
  });
  const friendProfileWork = friendProfileWorkForTab(friendProfileTab);
  const selectedSynastryContacts = useMemo(() => {
    if (!friendProfileWork.synastryContacts || !selectedChart || !selectedFriendReadyNatalChart || selectedChartIsEvent) {
      return [];
    }

    return rankSynastryContactsByLifeAreaFocus(
        synastryContacts(
          relationshipComparisonSky,
          selectedChart,
          selectedRelationshipContextType
        ),
        lifeAreaFocus
      );
  }, [
    fallbackArchitectureV3Version,
    friendProfileWork.synastryContacts,
    lifeAreaFocus,
    relationshipComparisonSky,
    selectedChart,
    selectedChartIsEvent,
    selectedFriendReadyNatalChart,
    selectedRelationshipContextType
  ]);
  const selectedSynastryAspectGroups = useMemo(() => (
    friendProfileWork.synastry
      ? groupAspectsByGiftLesson(
          selectedSynastryContacts,
          (contact) => contact.aspect,
          (contact) => contact.orb
        )
      : []
  ), [friendProfileWork.synastry, selectedSynastryContacts]);
  const selectedSynastryViewGroups = useMemo<FriendSynastryAspectGroup[]>(() => (
    selectedSynastryAspectGroups.map((group) => ({
      key: group.key,
      label: group.label,
      contacts: group.aspects.map((contact) => {
        const rendered = renderReaderDirectedSynastryContact(contact, selectedChart?.displayName ?? "Friend");

        return {
          id: contact.id,
          aspect: contact.aspect,
          orb: contact.orb,
          title: rendered?.headline ?? `Your ${contact.yourPoint.name} ${contact.aspect} ${selectedChart?.displayName ?? "Friend"}'s ${contact.friendPoint.name}`,
          subtitle: rendered?.tag ?? relationshipThemeTitle(contact.yourPoint.name, contact.friendPoint.name, contact.aspect),
          description: rendered?.body ? textPreview(rendered.body) : "",
          yourPoint: contact.yourPoint,
          friendPoint: contact.friendPoint
        };
      })
    }))
  ), [selectedChart?.displayName, selectedSynastryAspectGroups]);
  const selectedCompatibilityCards = useMemo(() => {
    if (!friendProfileWork.compatibility || !selectedChart || !selectedFriendReadyNatalChart || selectedChartIsEvent) {
      return [];
    }

    return compatibilityPlanetCards(
        relationshipComparisonSky,
        selectedChart,
        relationshipGeneratedContent,
        selectedRelationshipContextType,
        relationshipComparisonName,
        relationshipComparisonIsSelf
      );
  }, [
    fallbackArchitectureV3Version,
    friendProfileWork.compatibility,
    profile.moon,
    profile.sun,
    relationshipComparisonIsSelf,
    relationshipComparisonName,
    relationshipComparisonSky,
    relationshipGeneratedContent,
    selectedChart,
    selectedChartIsEvent,
    selectedFriendReadyNatalChart,
    selectedRelationshipContextType
  ]);
  const selectedCompatibilityIsLoading = Boolean(
    friendProfileWork.compatibility
    && selectedChart
    && !selectedChartIsEvent
    && (
      selectedFriendNatalChartRepairing
      || (
        relationshipComparisonIsSelf
        && relationshipPersonB
        && !relationshipComparisonSky
      )
    )
    && profileNatalCalculationStatus !== "error"
  );
  const selectedCompatibilityDynamics = useMemo(() => (
    friendProfileWork.compatibility
      ? compatibilityDynamicsFromContacts(
          selectedSynastryContacts,
          selectedChart?.displayName ?? "Friend",
          relationshipComparisonName,
          relationshipComparisonIsSelf,
          selectedChart?.pronouns,
          relationshipComparisonPronouns
        )
      : []
  ), [
    friendProfileWork.compatibility,
    relationshipComparisonIsSelf,
    relationshipComparisonName,
    relationshipComparisonPronouns,
    selectedChart?.displayName,
    selectedChart?.pronouns,
    selectedSynastryContacts
  ]);
  const selectedSynastryAspectLines = useMemo<InterChartAspectLine[]>(() => (
    (friendProfileWork.compatibility || friendProfileWork.synastry) && selectedChart && selectedFriendReadyNatalChart && !selectedChartIsEvent
      ? synastryWheelAspectLines(relationshipComparisonSky, selectedChart)
      : []
  ), [
    friendProfileWork.compatibility,
    friendProfileWork.synastry,
    relationshipComparisonSky,
    selectedChart,
    selectedChartIsEvent,
    selectedFriendReadyNatalChart
  ]);
  const selectedCompositeSky = useMemo(() => (
    friendProfileWork.composite && selectedChart && selectedFriendReadyNatalChart && !selectedChartIsEvent
      ? relationshipCompositeSky(relationshipComparisonSky, selectedChart)
      : null
  ), [friendProfileWork.composite, relationshipComparisonSky, selectedChart, selectedChartIsEvent, selectedFriendReadyNatalChart]);
  const selectedCompositeAspectGroups = useMemo(() => (
    friendProfileWork.composite
      ? groupAspectsByGiftLesson(
          selectedCompositeSky?.aspects ?? [],
          (aspect) => aspect.type,
          (aspect) => aspect.orb
        )
      : []
  ), [friendProfileWork.composite, selectedCompositeSky]);
  const selectedCompositePlacementRows = useMemo(() => (
    selectedCompositeSky
      ? compositePlacementRows(selectedCompositeSky, relationshipGeneratedContent)
      : []
  ), [relationshipGeneratedContent, selectedCompositeSky]);
  const selectedCompositeViewGroups = useMemo<FriendCompositeAspectGroup[]>(() => (
    selectedCompositeAspectGroups.map((group) => ({
      key: group.key,
      label: group.label,
      aspects: group.aspects.map((aspect) => ({
        from: aspect.from,
        type: aspect.type,
        to: aspect.to,
        orb: aspect.orb,
        summary: compositeAspectSummary(
          aspect,
          selectedChart?.displayName ?? "Friend",
          relationshipComparisonName,
          relationshipComparisonIsSelf,
          relationshipGeneratedContent,
          selectedChart?.relationshipType
        )
      }))
    }))
  ), [
    relationshipComparisonIsSelf,
    relationshipComparisonName,
    relationshipGeneratedContent,
    selectedChart?.displayName,
    selectedChart?.relationshipType,
    selectedCompositeAspectGroups
  ]);
  const selectedFriendHasChartRail = friendProfileTab === "natal"
    ? Boolean(selectedFriendReadyNatalChart)
    : friendProfileTab === "transits"
      ? Boolean(selectedFriendReadyNatalChart)
    : selectedChartIsEvent
      ? false
      : friendProfileTab === "compatibility"
      ? Boolean(selectedFriendReadyNatalChart && relationshipComparisonSky)
      : friendProfileTab === "synastry"
      ? Boolean(selectedFriendReadyNatalChart && relationshipComparisonSky)
      : Boolean(selectedCompositeSky);
  const friendChartRailRenderKey = selectedFriendHasChartRail && selectedChart
    ? [selectedChart.id, friendProfileTab, selectedRelationshipComparison?.id ?? "self"].join(":")
    : null;
  const [renderedFriendChartRailKey, setRenderedFriendChartRailKey] = useState<string | null>(null);

  useEffect(() => {
    if (!friendChartRailRenderKey) {
      setRenderedFriendChartRailKey(null);
      return undefined;
    }

    let paintFrameId = 0;
    const contentFrameId = window.requestAnimationFrame(() => {
      paintFrameId = window.requestAnimationFrame(() => {
        setRenderedFriendChartRailKey(friendChartRailRenderKey);
      });
    });

    return () => {
      window.cancelAnimationFrame(contentFrameId);
      window.cancelAnimationFrame(paintFrameId);
    };
  }, [friendChartRailRenderKey]);

  const renderFriendChartRail = renderedFriendChartRailKey === friendChartRailRenderKey;
  const selectedFriendTransitCandidates = useMemo(() => (
    (friendProfileWork.transits || friendProfileWork.compatibility) && currentSky && selectedChart && selectedFriendReadyNatalChart && !selectedChartIsEvent
      ? dedupeSameBeatPersonalTransits(
          rankTransitsByLifeAreaFocus(rankedFriendTransits(currentSky, selectedChart, sunriseOrbDegrees), lifeAreaFocus),
          currentSky.generatedAt
        )
      : []
  ), [
    currentSky,
    friendProfileWork.compatibility,
    friendProfileWork.transits,
    lifeAreaFocus,
    selectedChart,
    selectedChartIsEvent,
    selectedFriendReadyNatalChart,
    sunriseOrbDegrees
  ]);
  const selectedFriendTransits = useMemo(
    () => selectedFriendTransitCandidates.slice(0, 8),
    [selectedFriendTransitCandidates]
  );
  const selectedFriendEligibleTransits = useMemo(() => (
    currentSky && selectedChart
      ? selectEligibleFriendTransits(
          selectedFriendTransitCandidates,
          (transit) => {
            const normalized = normalizePersonalTransitSurface(
              transit,
              currentSky.generatedAt,
              selectedChart.displayName
            );
            return acceptedOwnerApprovedTransitSections(
              normalized.sections,
              fallbackV3ApprovalLevelForContentKey
            ).length > 0;
          },
          8
        )
      : []
  ), [
    currentSky,
    fallbackArchitectureV3Version,
    selectedChart,
    selectedFriendTransitCandidates
  ]);
  const selectedFriendDailyForecast = useMemo(() => (
    currentSky && selectedChart && selectedFriendReadyNatalChart && !selectedChartIsEvent
      ? friendDailyGlance(
          currentSky,
          selectedFriendReadyNatalChart,
          selectedChart.displayName,
          selectedChart.firstName,
          selectedChart.pronouns,
          selectedChart.birthTimeUnknown,
          selectedChart.id
        )
      : null
  ), [currentSky, selectedChart, selectedChartIsEvent, selectedFriendReadyNatalChart]);
  const selectedFriendDailyDoDont = useMemo(() => (
    currentSky && selectedFriendReadyNatalChart && !selectedChartIsEvent
      ? friendDailyDoDont(currentSky, selectedFriendReadyNatalChart, selectedFriendTransits)
      : null
  ), [currentSky, selectedChartIsEvent, selectedFriendReadyNatalChart, selectedFriendTransits]);
  const selectedFriendHouseTransitCards = useMemo(() => {
    if (!friendProfileWork.transits || !currentSky || !selectedChart || !selectedFriendReadyNatalChart || selectedChartIsEvent) {
      return [];
    }

    return rankFriendHouseTransitActivations(
      currentSkyHouseActivations(currentSky, selectedFriendReadyNatalChart)
    )
      .slice(0, 4)
      .map((activation) => {
        const transit = {
          id: activation.id,
          transitMotion: activation.position.motion,
          transitPlanet: activation.position.planet,
          transitSign: activation.position.sign
        };
        const timingRange = placementTransitRangeLabel(activation.position, currentSky.generatedAt);
        const durationLabel = placementTransitDurationLabel(activation.position, currentSky.generatedAt);
        const normalized = normalizeTransitHouseSurface(
          transit,
          activation.house,
          timingRange,
          selectedChart.displayName,
          transitHouseAspectEvents(
            transit.transitPlanet,
            selectedFriendTransits,
            currentSky.generatedAt
          ),
          friendGeneratedContent
        );
        const renderedWindow = normalized.sections[0]?.window ?? timingRange;

        return {
          activation,
          contentKey: transitHouseContentKey(transit.transitPlanet, activation.house),
          normalized,
          rowSummary: transitCardPreview(
            transitBodyWithoutRepeatedWindow(normalizedSurfacePreview(normalized), renderedWindow)
          ),
          durationLabel,
          timingRange: renderedWindow,
          title: `${transit.transitPlanet} through ${possessiveLabel(selectedChart.displayName)} ${ordinalHouse(activation.house)} house`,
          transit
        };
      });
  }, [
    currentSky,
    friendGeneratedContent,
    friendProfileWork.transits,
    selectedChart,
    selectedChartIsEvent,
    selectedFriendReadyNatalChart,
    selectedFriendTransits
  ]);
  const selectedBondTransitCards = useMemo(() => (
    (friendProfileWork.transits || friendProfileWork.compatibility) && currentSky && selectedChart && !selectedChartIsEvent
      ? activeBondTransitCards(
        selectedSynastryContacts,
        selectedFriendTransits,
        profileTransits,
        selectedChart.displayName,
        selectedChart.pronouns,
        currentSky.generatedAt
      )
      : []
  ), [
    currentSky?.generatedAt,
    friendProfileWork.compatibility,
    friendProfileWork.transits,
    profileTransits,
    selectedChart,
    selectedChartIsEvent,
    selectedFriendTransits,
    selectedSynastryContacts
  ]);
  const selectedPairDailySelection = useMemo(() => {
    if (
      !friendProfileWork.compatibility
      || !relationshipComparisonIsSelf
      || !currentSky
      || !profileNatalSky
      || !selectedChart
      || !selectedFriendReadyNatalChart
      || selectedChartIsEvent
    ) {
      return null;
    }

    const isoDate = currentSky.generatedAt.slice(0, 10);
    const readerChartId = profile.charts[0]?.id ?? profile.id;
    const pairVariant = stablePairDailyVariant(readerChartId, selectedChart.id, isoDate);

    // Pair Daily reuses the Daily At-a-Glance applying-contact selector, then
    // rotates only within its tightest three qualifying contacts. The canonical
    // selector returns the unchanged single house fallback when no contact applies.
    const readerDriver = pairDailyDriver(
      currentSky,
      profileNatalSky,
      pairVariant,
      profile.charts[0]?.birthTime === "Time unknown"
    );
    const friendDriver = pairDailyDriver(
      currentSky,
      selectedFriendReadyNatalChart,
      pairVariant,
      selectedChart.birthTimeUnknown
    );
    if (!readerDriver || !friendDriver) return null;

    const driverSelection = { readerDriver, friendDriver, pairVariant };
    const moon = currentSky.positions.find((position) => position.planet === "Moon") ?? null;
    const element = moon ? pairDailyMoonElement(moon.sign) : null;
    const fallbackShared = readerDriver.kind === "aspect" && friendDriver.kind === "aspect" && element
      ? { kind: "moon" as const, element }
      : { kind: null };

    const selectedBondTransit = selectedBondTransitCards[0];
    if (selectedBondTransit) {
      return {
        ...driverSelection,
        shared: {
          kind: "bond" as const,
          family: selectedBondTransit.effectFamily,
          transiting: selectedBondTransit.transitPlanet
        },
        fallbackShared
      };
    }

    return {
      ...driverSelection,
      shared: fallbackShared,
      fallbackShared: { kind: null }
    };
  }, [
    currentSky,
    friendProfileWork.compatibility,
    profile.charts,
    profile.id,
    profileNatalSky,
    relationshipComparisonIsSelf,
    selectedBondTransitCards,
    selectedChart,
    selectedChartIsEvent,
    selectedFriendReadyNatalChart
  ]);
  const selectedPairDaily = useMemo(() => {
    if (!selectedPairDailySelection || !currentSky || !selectedChart) return null;

    const isoDate = currentSky.generatedAt.slice(0, 10);

    const renderShared = (shared: typeof selectedPairDailySelection.shared) => (
      transitSynastryFallbackRendererV3.renderPairDaily({
        reader: {
          handle: profileHandle,
          clauseKey: pairDailyClauseKey(selectedPairDailySelection.readerDriver)
        },
        friend: {
          handle: selectedSocialFriend?.handle ?? null,
          displayName: selectedChart.displayName,
          clauseKey: pairDailyClauseKey(selectedPairDailySelection.friendDriver)
        },
        shared,
        variant: selectedPairDailySelection.pairVariant
      })
    );

    try {
      let rendered;
      try {
        rendered = renderShared(selectedPairDailySelection.shared);
      } catch (error) {
        if (
          !(error instanceof FallbackV3SourceGapError)
          || selectedPairDailySelection.shared.kind !== "bond"
        ) {
          throw error;
        }
        rendered = renderShared(selectedPairDailySelection.fallbackShared);
      }

      return rendered.body
        ? { body: rendered.body, dateLabel: formatPairDailyDate(isoDate) }
        : null;
    } catch (error) {
      if (error instanceof FallbackV3SourceGapError) return null;
      throw error;
    }
  }, [
    currentSky,
    fallbackArchitectureV3Version,
    profileHandle,
    selectedChart,
    selectedPairDailySelection,
    selectedSocialFriend?.handle
  ]);
  const selectedFriendTransitAspectLines = useMemo(() => (
    friendProfileWork.transits && currentSky && selectedChart && selectedFriendReadyNatalChart && !selectedChartIsEvent
      ? transitWheelAspectLines(currentSky, selectedFriendReadyNatalChart, selectedFriendEligibleTransits)
      : []
  ), [currentSky, friendProfileWork.transits, selectedChart, selectedChartIsEvent, selectedFriendEligibleTransits, selectedFriendReadyNatalChart]);
  const selectedBondTransitViewCards = useMemo<FriendBondTransitView[]>(() => (
    selectedBondTransitCards.map((card) => ({
      id: card.id,
      headline: card.headline,
      effectBody: card.effectBody,
      activationBody: card.activationBody
    }))
  ), [selectedBondTransitCards]);
  const selectedFriendHouseTransitViewCards = useMemo<FriendHouseTransitView[]>(() => (
    selectedFriendHouseTransitCards.map((card) => ({
      id: card.contentKey,
      transitPlanet: card.transit.transitPlanet,
      title: card.title,
      durationLabel: card.durationLabel,
      timingRange: card.timingRange,
      rowSummary: card.rowSummary,
      termLabel: longTransitPlanets.has(card.transit.transitPlanet) ? "Long-term" : "Short-term",
      keywords: houseLifeAreaKeywords(card.activation.house),
      house: card.activation.house,
      houseLabel: `${ordinalHouse(card.activation.house)} house`,
      detailAvailable: acceptedOwnerApprovedTransitSections(
        card.normalized.detailSections,
        fallbackV3ApprovalLevelForContentKey
      ).length > 0
    }))
  ), [selectedFriendHouseTransitCards]);
  const selectedFriendPersonalTransitGroups = useMemo<FriendPersonalTransitGroup[]>(() => {
    if (!currentSky) {
      return [];
    }

    return (["short", "long"] as const).flatMap((durationClass) => {
      const transits = selectedFriendEligibleTransits.filter((transit) => transit.term === durationClass);

      if (transits.length === 0 || !selectedChart) {
        return [];
      }

      return [{
        key: durationClass,
        label: durationClass === "short" ? "Short-term themes" : "Long-term themes",
        transits: transits.map((transit) => {
          const timing = transitItemTimingDisplay(transit, currentSky.generatedAt);
          const normalized = normalizePersonalTransitSurface(
            transit,
            currentSky.generatedAt,
            selectedChart.displayName
          );

          return {
            id: transit.id,
            title: `${transit.transitPlanet} ${transitAspectTechnicalVerb(transit.aspect)} ${transit.natalPoint}`,
            durationLabel: timing.durationLabel,
            rangeLabel: timing.rangeLabel,
            timingLabel: timing.label,
            summary: friendTransitSummary(
              transit,
              relationshipGeneratedContent,
              selectedChart.displayName,
              selectedChart.pronouns,
              currentSky.generatedAt
            ),
            orb: transit.orb,
            detailAvailable: acceptedOwnerApprovedTransitSections(
              normalized.sections,
              fallbackV3ApprovalLevelForContentKey
            ).length > 0
          };
        })
      }];
    });
  }, [currentSky, fallbackArchitectureV3Version, relationshipGeneratedContent, selectedChart, selectedFriendEligibleTransits]);
  const selectedFriendPlacementRows = useMemo(() => {
    if (!friendProfileWork.natal || !selectedChart || !selectedFriendReadyNatalChart) {
      return [];
    }

    const natalChart = selectedFriendReadyNatalChart;
    return socialPlacementRows(natalChart).map((row) => {
      const position = planetPositionFromSocialRow(row, natalChart);
      const detail = position
        ? natalPlacementSkyDetail(
            position,
            natalChart,
            null,
            friendGeneratedContent,
            undefined,
            {
              ownerName: selectedChart.displayName,
              ownerKind: selectedChartIsEvent ? "chart" : "person",
              ownerPronouns: selectedChart.pronouns
            }
          )
        : null;

      return {
        ...row,
        description: friendPlacementDescription(row.label, row.sign, friendGeneratedContent),
        detailAvailable: Boolean(detail && friendDetailHasReaderFacingContent(detail))
      };
    });
  }, [
    fallbackArchitectureV3Version,
    friendGeneratedContent,
    friendProfileWork.natal,
    selectedFriendReadyNatalChart,
    selectedChart,
    selectedChartIsEvent
  ]);
  const selectedFriendBigThreeDisplayRows = useMemo<SocialPlacementRow[]>(() => {
    if (!friendProfileWork.natal) {
      return [];
    }

    const bigThreeRows = selectedFriendPlacementRows.filter(isSocialBigThreeRow);

    return bigThreeRows.length
      ? bigThreeRows
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
  }, [friendProfileWork.natal, selectedFriendBigThree, selectedFriendPlacementRows]);
  const selectedFriendNatalPlacementRows = useMemo(() => (
    selectedChartIsEvent
      ? selectedFriendPlacementRows
      : selectedFriendPlacementRows.filter((row) => !isSocialBigThreeRow(row))
  ), [selectedChartIsEvent, selectedFriendPlacementRows]);
  const selectedFriendNatalTableRows = useMemo(() => {
    if (!friendProfileWork.natal || !selectedFriendReadyNatalChart) {
      return [];
    }

    return completeNatalChartTableRows(
      selectedFriendReadyNatalChart,
      selectedFriendPlacementRows.map(natalChartTableRowFromSocial)
    );
  }, [friendProfileWork.natal, selectedFriendPlacementRows, selectedFriendReadyNatalChart]);
  const selectedFriendNatalAspectPatternItems = useMemo(() => (
    showFriendNatalAspectPatterns && (friendProfileWork.natal || friendProfileWork.transits) && selectedChart
      ? natalAspectPatternReaderItemsForOwner(
          selectedFriendReadyNatalChart,
          selectedChart.displayName,
          selectedChartIsEvent ? "chart" : "person",
          selectedChart.pronouns
        )
      : []
  ), [
    friendProfileWork.natal,
    friendProfileWork.transits,
    selectedChart,
    selectedChartIsEvent,
    selectedFriendReadyNatalChart,
    showFriendNatalAspectPatterns
  ]);
  const selectedFriendNatalAspectPatternTimingOverrides = useMemo(() => (
    friendProfileWork.transits && currentSky
      ? activationTimingOverridesForTransits(
          selectedFriendNatalAspectPatternItems,
          selectedFriendTransits,
          currentSky.generatedAt
        )
      : {}
  ), [
    currentSky?.generatedAt,
    friendProfileWork.transits,
    selectedFriendNatalAspectPatternItems,
    selectedFriendTransits
  ]);
  const selectedFriendNatalAspectPatternStatus = friendProfileWork.natal && showFriendNatalAspectPatterns && selectedFriendReadyNatalChart
    ? natalAspectPatternReaderStatus(
        showFriendNatalAspectPatterns,
        selectedFriendReadyNatalChart,
        false,
        selectedFriendReadyNatalChart.aspectPatterns?.interpretationContexts ? "ready" : "unavailable"
      )
    : undefined;
  const selectedFriendEmptyHouses = useMemo(() => {
    if (!friendProfileWork.natal || !selectedFriendReadyNatalChart || selectedChartIsEvent) {
      return [];
    }

    const occupiedHouses = new Set(
      selectedFriendReadyNatalChart.positions
        .filter((position) => ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"].includes(position.planet))
        .map((position) => position.house)
        .filter((house): house is number => typeof house === "number")
    );

    return Array.from({ length: 12 }, (_, index) => index + 1).filter((house) => !occupiedHouses.has(house));
  }, [friendProfileWork.natal, selectedChartIsEvent, selectedFriendReadyNatalChart]);
  const selectedFriendEmptyHouseViewRows = useMemo<FriendNatalEmptyHouseRow[]>(() => {
    const friendNatalChart = selectedFriendReadyNatalChart;

    if (!friendNatalChart || !selectedChart) {
      return [];
    }

    return selectedFriendEmptyHouses.map((house) => {
      const houseSign = signAtWholeSignHouse(friendNatalChart.ascendant, house);
      const title = emptyHouseTitle(house, friendNatalChart);

      const article = emptyHouseDetailArticle(
        house,
        friendNatalChart,
        "friend",
        selectedChart.displayName,
        selectedChart.pronouns,
        selectedFriendEmptyHouses,
        friendGeneratedContent
      );
      const detailAvailable = friendDetailHasReaderFacingContent({
        body: article.body ?? [],
        sections: article.sections.map((section) => ({
          heading: section.heading,
          body: section.body
        }))
      });

      return {
        house,
        glyph: houseSign ? zodiacSignGlyphs[houseSign] ?? "○" : "○",
        title,
        ariaLabel: `Read more about ${title}`,
        detailAvailable,
        description: emptyHouseCardDescription(
          house,
          friendNatalChart,
          "friend",
          selectedChart.displayName,
          selectedChart.pronouns,
          selectedFriendEmptyHouses,
          friendGeneratedContent
        )
      };
    });
  }, [fallbackArchitectureV3Version, friendGeneratedContent, selectedChart, selectedFriendEmptyHouses, selectedFriendReadyNatalChart]);
  const openFriendDetail = (detail: SkyDetail) => {
    if (!friendDetailHasReaderFacingContent(detail)) {
      return false;
    }

    onOpenDetail(detail);
    return true;
  };
  const openFriendCompatibilityCardDetail = (card: CompatibilityPlanetCard, paragraphs: string[]) => {
    if (!selectedChart) {
      return;
    }

    openFriendDetail({
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

    openFriendDetail({
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
  const openFriendNatalAspectPatternDetail = (
    item: NatalAspectPatternReaderItem,
    nestedItems: NatalAspectPatternReaderItem[]
  ) => {
    if (!selectedChart) {
      return;
    }

    const copy = item.copy.content;
    const detailSections = [item, ...nestedItems].flatMap((patternItem, patternIndex) => {
      const patternCopy = patternItem.copy.content;
      const prefix = patternIndex === 0 ? "" : `${patternCopy.headline}: `;

      return patternCopy.sections
        .map((section) => ({
          heading: resolvedNatalAspectPatternSectionLabel(section),
          body: section.body.trim()
        }))
        .filter((section): section is { heading: string; body: string } => Boolean(section.heading && section.body))
        .map((section) => ({
          heading: `${prefix}${section.heading}`,
          body: section.body
        }));
    });

    openFriendDetail({
      routePath: friendDetailRoutePath(
        selectedChart.id,
        "natal",
        `natal-pattern-${normalizeContentIdPart(item.patternId)}`
      ),
      glyph: "",
      kicker: copy.eyebrow || "Chart pattern",
      title: copy.headline,
      meta: copy.eyebrow || "Chart pattern",
      suppressTldr: true,
      bodyBeforeSections: true,
      plainBody: true,
      body: [copy.overview],
      sections: detailSections
    });
  };
  const openFriendNatalPlacementDetail = (row: SocialPlacementRow) => {
    if (!selectedChart || !selectedFriendReadyNatalChart) {
      return;
    }

    const position = planetPositionFromSocialRow(row, selectedFriendReadyNatalChart);

    if (!position) {
      return;
    }

    openFriendDetail({
      ...natalPlacementSkyDetail(
      position,
      selectedFriendReadyNatalChart,
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
    if (!selectedChart || !selectedFriendReadyNatalChart) {
      return;
    }

    const article = emptyHouseDetailArticle(
      house,
      selectedFriendReadyNatalChart,
      "friend",
      selectedChart.displayName,
      selectedChart.pronouns,
      selectedFriendEmptyHouses,
      friendGeneratedContent
    );

    openFriendDetail({
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
  const openFriendHouseTransitDetail = (
    card: (typeof selectedFriendHouseTransitCards)[number]
  ) => {
    if (!selectedChart) {
      return;
    }

    const eligibleSections = acceptedOwnerApprovedTransitSections(
      card.normalized.detailSections,
      fallbackV3ApprovalLevelForContentKey
    );

    if (eligibleSections.length === 0) {
      return;
    }

    openFriendDetail({
      routePath: friendDetailRoutePath(
        selectedChart.id,
        "transits",
        `house-transit-${normalizeContentIdPart(card.transit.transitPlanet)}-${card.activation.house}`
      ),
      glyph: pointGlyph(card.transit.transitPlanet),
      kicker: "House transit",
      title: card.title,
      meta: [
        card.timingRange,
        `${ordinalHouse(card.activation.house)} House`,
        houseLifeAreas[card.activation.house] ?? ""
      ].filter(Boolean).join(" · "),
      body: [],
      sections: eligibleSections.map((section) => ({
        // The page-level title already names this house transit. Repeating the
        // resolver headline here creates a near-identical second title.
        heading: "",
        body: section.body,
        sourceKeys: section.sourceKeys
      }))
    });
  };
  const openFriendHouseTransitById = (cardId: string) => {
    const card = selectedFriendHouseTransitCards.find((candidate) => candidate.contentKey === cardId);

    if (card) {
      openFriendHouseTransitDetail(card);
    }
  };
  const openBondTransitDetail = (
    card: (typeof selectedBondTransitCards)[number]
  ) => {
    if (!selectedChart) {
      return;
    }

    const activatedConnectionSections = card.activatedContacts.flatMap((contact) => {
      const rendered = renderReaderDirectedSynastryContact(
        contact,
        selectedChart.displayName
      );

      return rendered ? [rendered] : [];
    });

    openFriendDetail({
      routePath: friendDetailRoutePath(
        selectedChart.id,
        "transits",
        `connection-transit-${normalizeContentIdPart(card.id)}`
      ),
      glyph: pointGlyph(card.transitPlanet),
      kicker: "Between you two right now",
      title: card.headline,
      meta: [card.transitSign, card.timingRange].filter(Boolean).join(" · "),
      bodyBeforeSections: activatedConnectionSections.length > 0,
      body: acceptedOwnerApprovedTransitBody(
        card.effectBody,
        card.effectContentKey,
        fallbackV3ApprovalLevelForContentKey
      ),
      sections: activatedConnectionSections.map((connection, index) => ({
        heading: index === 0 ? "What this activates" : "",
        sourceTag: connection.headline,
        body: connection.body
      }))
    });
  };
  const openBondTransitById = (cardId: string) => {
    const card = selectedBondTransitCards.find((candidate) => candidate.id === cardId);

    if (card) {
      openBondTransitDetail(card);
    }
  };
  const openFriendSynastryContactDetail = (contactId: string) => {
    if (!selectedChart) {
      return;
    }

    const contact = selectedSynastryContacts.find((candidate) => candidate.id === contactId);

    if (!contact) {
      return;
    }

    const rendered = renderReaderDirectedSynastryContact(contact, selectedChart.displayName);
    const title = rendered?.headline ?? `Your ${contact.yourPoint.name} ${contact.aspect} ${selectedChart.displayName}'s ${contact.friendPoint.name}`;
    const subtitle = rendered?.tag ?? relationshipThemeTitle(contact.yourPoint.name, contact.friendPoint.name, contact.aspect);

    openFriendDetail({
      routePath: friendDetailRoutePath(selectedChart.id, "synastry", `synastry-${contact.id}`),
      glyph: `${pointGlyph(contact.friendPoint.name)} ${aspectGlyph(contact.aspect)} ${pointGlyph(contact.yourPoint.name)}`,
      kicker: "Synastry",
      title,
      meta: `${subtitle.toUpperCase()} · ${wholeDegreeOrb(contact.orb)}`,
      body: rendered?.body ? [rendered.body] : [],
      content: emptyContentFallback(rendered?.templateKey ?? contact.contentKeys[0] ?? contact.id).bundle
    });
  };
  const openFriendTransitDetail = (transit: TransitItem) => {
    if (!currentSky || !selectedChart) {
      return;
    }

    const timing = transitItemTimingDisplay(transit, currentSky.generatedAt);
    const normalized = normalizePersonalTransitSurface(
      transit,
      currentSky.generatedAt,
      selectedChart.displayName
    );
    const title = `${transit.transitPlanet} ${transitAspectTechnicalVerb(transit.aspect)} ${transit.natalPoint}`;
    const orbLabel = wholeDegreeOrb(transitOrbValue(transit));
    const transitPosition = transit.transitSign
      ? `${transit.transitPlanet} in ${transit.transitSign}`
      : transit.transitPlanet;
    const natalPosition = [
      `${possessiveLabel(selectedChart.displayName)} natal ${transit.natalPoint}`,
      transit.natalSign ? `in ${transit.natalSign}` : "",
      transit.natalHouse ? `in the ${ordinalHouse(transit.natalHouse)} house` : ""
    ].filter(Boolean).join(" ");
    const directionSentence = transit.direction
      ? ` The aspect is ${transit.direction}.`
      : "";
    const eligibleSections = acceptedOwnerApprovedTransitSections(
      normalized.sections,
      fallbackV3ApprovalLevelForContentKey
    );

    if (eligibleSections.length === 0) {
      return;
    }

    openFriendDetail({
      routePath: friendDetailRoutePath(
        selectedChart.id,
        "transits",
        `transit-${normalizeContentIdPart(transit.id)}`
      ),
      glyph: `${pointGlyph(transit.transitPlanet)} ${aspectGlyph(transit.aspect)} ${pointGlyph(transit.natalPoint)}`,
      kicker: "Transit",
      title,
      duration: `${timing.durationLabel} · ${timing.rangeLabel}`,
      meta: [
        timing.rangeLabel,
        `${orbLabel} orb`,
        transit.natalPoint
      ].filter(Boolean).join(" · "),
      body: [],
      sections: eligibleSections.map((section) => ({
        heading: "",
        body: section.body,
        sourceKeys: section.sourceKeys
      })),
      mechanicsCaption: `${transitPosition} is ${transitAspectTechnicalVerb(transit.aspect)} ${natalPosition} at a ${orbLabel} orb.${directionSentence}`
    });
  };
  const openFriendTransitById = (transitId: string) => {
    const transit = selectedFriendEligibleTransits.find((candidate) => candidate.id === transitId);

    if (transit) {
      openFriendTransitDetail(transit);
    }
  };

  useEffect(() => {
    const routeState = friendsRouteStateFromUrl();
    if (
      !routeState?.detail
      || routeState.view !== "transits"
      || routeState.chartId !== selectedChart?.id
      || !currentSky
    ) {
      return;
    }

    const prefix = "transit-";
    if (!routeState.detail.startsWith(prefix)) {
      return;
    }

    const routedTransitId = routeState.detail.slice(prefix.length);
    const transit = selectedFriendEligibleTransits.find((candidate) => (
      normalizeContentIdPart(candidate.id) === routedTransitId
    ));
    if (!transit) {
      return;
    }

    const refreshKey = [
      routeState.chartId,
      routeState.detail,
      fallbackArchitectureV3Version,
      currentSky.generatedAt
    ].join(":");
    if (friendRouteDetailRefreshKeyRef.current === refreshKey) {
      return;
    }

    friendRouteDetailRefreshKeyRef.current = refreshKey;
    openFriendTransitDetail(transit);
  }, [
    currentSky,
    fallbackArchitectureV3Version,
    selectedChart?.id,
    selectedFriendTransits
  ]);
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
    const requestedTab = activeFriendProfileContentRequest({
      activeTab: friendProfileTab,
      profileActive: resolvedFriendsMainView === "profile" && Boolean(selectedChart)
    });
    if (requestedTab) {
      onFriendProfileContentRequest(requestedTab);
    }
  }, [friendProfileTab, onFriendProfileContentRequest, resolvedFriendsMainView, selectedChart?.id]);

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

  const isLoadingCharts = status === "loading";
  const friendChartListItems = useMemo(
    () => buildFriendChartListItems(
      charts,
      selectedChart?.id ?? null,
      showFriendNatalAspectPatterns
    ),
    [charts, selectedChart?.id, showFriendNatalAspectPatterns]
  );
  useEffect(() => {
    setRelationshipComparisonPickerOpen(false);
    setRelationshipComparisonChartId((currentId) => {
      if (currentId === "self") {
        return currentId;
      }

      if (currentId === selectedChart?.id) {
        return "self";
      }

      return allFriendCharts.some((chart) => chart.id === currentId) ? currentId : "self";
    });
  }, [allFriendCharts, selectedChart?.id]);

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

    if (relationshipChartFullscreenMode === "synastry" && !(selectedFriendReadyNatalChart && relationshipComparisonSky)) {
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
    selectedFriendReadyNatalChart,
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
    prepareChartEdit(chart);
    setOpenChartMenuId(null);
    setFriendChartModalOpen(true);
  }

  function addBirthTime(chart: ManualChart) {
    prepareBirthTimeEdit(chart);
    setOpenChartMenuId(null);
    setFriendChartModalOpen(true);
  }

  function requestDeleteChart(chart: ManualChart) {
    setOpenChartMenuId(null);
    setDeleteCandidateChart(chart);
  }

  function openFriendProfile(chart: ManualChart) {
    setOpenChartMenuId(null);
    requestFriendProfileTab(chart.chartType === "event" ? "natal" : "compatibility");
    setSelectedChartId(chart.id);
    setFriendProfileTab(chart.chartType === "event" ? "natal" : "compatibility");
    setRelationshipComparisonChartId("self");
    setRelationshipComparisonPickerOpen(false);
    setFriendsMainView("profile");
    updateFriendProfileUrl(chart.id, chart.chartType === "event" ? "natal" : "compatibility");
  }

  function changeFriendProfileTab(tab: FriendProfileTab) {
    requestFriendProfileTab(tab);
    setFriendProfileTab(tab);
    if (selectedChart) {
      updateFriendProfileUrl(selectedChart.id, tab);
    }
  }

  function requestFriendProfileTab(tab: FriendProfileTab) {
    preloadFriendProfileComponents(tab);
    onFriendProfileContentRequest(tab);
  }

  function prefetchFriendProfile(chart: ManualChart) {
    requestFriendProfileTab(chart.chartType === "event" ? "natal" : "compatibility");
  }

  async function saveManualChart(event: FormEvent<HTMLFormElement>) {
    const result = await saveChart(event);

    if (!result) {
      return;
    }

    const { chart: savedChart, wasEditing } = result;
    requestFriendProfileTab(savedChart.chartType === "event" ? "natal" : "compatibility");
    setFriendsMainView("profile");
    setFriendProfileTab(savedChart.chartType === "event" ? "natal" : "compatibility");
    setRelationshipComparisonChartId("self");
    setRelationshipComparisonPickerOpen(false);
    updateFriendProfileUrl(savedChart.id, savedChart.chartType === "event" ? "natal" : "compatibility", "replace");
    resetForm(wasEditing ? "Chart updated." : "Chart created.");
    setFriendChartModalOpen(false);
  }

  async function removeChart(chart: ManualChart) {
    setOpenChartMenuId(null);
    const deleted = await deleteStoredChart(chart);

    if (!deleted) {
      return;
    }

    setRelationshipComparisonChartId((currentId) => currentId === chart.id ? "self" : currentId);
    setRelationshipComparisonPickerOpen(false);
    if (selectedChartId === chart.id) {
      selectFriendsTab("charts", "replace");
    }
    setDeleteCandidateChart(null);
  }

  const isFriendDetailView = resolvedFriendsMainView === "profile" && Boolean(selectedChart);

  return (
    <Suspense fallback={<FeatureLoadingFallback />}>
      <FriendsWorkspaceShell
        activeView={resolvedFriendsMainView}
        chartListProps={{
          charts: friendChartListItems,
          isLoading: isLoadingCharts,
          message,
          openChartMenuId,
          showMessage: !friendChartModalOpen,
          onAddBirthTime: addBirthTime,
          onAddChart: openAddChartModal,
          onDeleteChart: requestDeleteChart,
          onEditChart: editChart,
          onChartIntent: prefetchFriendProfile,
          onOpenChart: openFriendProfile,
          onToggleChartMenu: (chartId) => setOpenChartMenuId((currentId) => currentId === chartId ? null : chartId)
        }}
        detailVariant={friendProfileTab}
        isDetailView={isFriendDetailView}
        onBackToCharts={() => selectFriendsTab("charts")}
        socialPanelProps={{
          activeView: resolvedFriendsMainView === "profile" ? "charts" : resolvedFriendsMainView,
          chartCount: friendChartListItems.length,
          onAddChart: openAddChartModal,
          onFriendsChange: setSocialFriends,
          onOpenFriend: (friend) => openFriendProfile(socialFriendToChart(friend)),
          onPendingRequestCountChange,
          onSelectView: (view, historyMode) => selectFriendsTab(view, historyMode),
          showPatternPills: showFriendNatalAspectPatterns
        }}
      >

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
        <FriendProfileChartFullscreen
          chartName={selectedChart.displayName}
          comparisonName={relationshipComparisonName}
          comparisonOptions={relationshipComparisonOptions}
          comparisonPickerOpen={relationshipComparisonPickerOpen}
          comparisonSelectedId={selectedRelationshipComparison?.id ?? "self"}
          compositeSky={selectedCompositeSky}
          houseSignLabelStyle={houseSignLabelStyle}
          mode={relationshipChartFullscreenMode}
          natalSky={selectedFriendReadyNatalChart}
          onClose={() => {
            setRelationshipComparisonPickerOpen(false);
            setRelationshipChartFullscreenMode(null);
          }}
          onComparisonSelect={(id) => {
            setRelationshipComparisonChartId(id);
            setRelationshipComparisonPickerOpen(false);
          }}
          onComparisonToggle={() => setRelationshipComparisonPickerOpen((current) => !current)}
          outerInitials={profileInitials(selectedChart.displayName, selectedChart.displayName)}
          relationshipComparisonSky={relationshipComparisonSky}
          synastryAspects={selectedSynastryAspectLines}
        />
      )}
      {resolvedFriendsMainView === "profile" && selectedChart && (
        <FriendDetail
          activeTab={friendProfileTab}
          ariaLabel={`${selectedChart.displayName} chart profile`}
          avatarUrl={selectedSocialFriend?.avatarUrl}
          chartRail={renderFriendChartRail ? (
            <FriendProfileChartRail
              activeTab={friendProfileTab}
              chartIsEvent={selectedChartIsEvent}
              chartName={selectedChart.displayName}
              comparisonIsSelf={relationshipComparisonIsSelf}
              comparisonName={relationshipComparisonName}
              comparisonOptions={relationshipComparisonOptions}
              comparisonPickerOpen={relationshipComparisonPickerOpen}
              comparisonSelectedId={selectedRelationshipComparison?.id ?? "self"}
              compositeSky={selectedCompositeSky}
              currentSkyPositions={currentSky?.positions ?? []}
              houseSignLabelStyle={houseSignLabelStyle}
              natalSky={selectedFriendReadyNatalChart}
              natalTableRows={selectedFriendNatalTableRows}
              natalViewMode={friendNatalChartViewMode}
              onComparisonSelect={(id) => {
                setRelationshipComparisonChartId(id);
                setRelationshipComparisonPickerOpen(false);
              }}
              onComparisonToggle={() => setRelationshipComparisonPickerOpen((current) => !current)}
              onNatalViewModeChange={setFriendNatalChartViewMode}
              outerInitials={profileInitials(selectedChart.displayName, selectedChart.displayName)}
              relationshipComparisonSky={relationshipComparisonSky}
              synastryAspects={selectedSynastryAspectLines}
              transitAspects={selectedFriendTransitAspectLines}
            />
          ) : null}
          className={`friend-profile-panel friend-focus-panel friend-profile-view friend-chart-page friend-chart-page--${friendProfileTab} chart-layout friend-detail-layout relationship-detail-layout${selectedFriendHasChartRail ? "" : " relationship-detail-no-chart"}`}
          initials={profileInitials(selectedChart.displayName, selectedChart.displayName)}
          isEventChart={selectedChartIsEvent}
          moon={selectedFriendBigThree?.moon ?? "Pending"}
          name={selectedChart.displayName}
          onEdit={isSocialFriendChart(selectedChart) ? undefined : () => editChart(selectedChart)}
          onTabChange={changeFriendProfileTab}
          onTabIntent={requestFriendProfileTab}
          rising={selectedFriendBigThree?.rising ?? "Rising pending"}
          subtitle={selectedSocialFriend ? `@${selectedSocialFriend.handle}` : undefined}
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
            selectedCompatibilityIsLoading ? (
              <div
                className="friend-tab-pane friend-compat-stage friend-compatibility-stage friend-compatibility-loading"
                aria-label={`${selectedChart.displayName} compatibility loading`}
                aria-live="polite"
                role="status"
              >
                <div className="friend-profile-copy-column compatibility-column">
                  <article className="friends-logic-card friend-compatibility-loading__card">
                    <span>Compatibility</span>
                    <h3>Loading compatibility…</h3>
                    <div className="friend-compatibility-loading__lines" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                  </article>
                </div>
              </div>
            ) : selectedCompatibilityCards.length > 0 ? (
              <CompatibilityTab
                cards={selectedCompatibilityCards}
                daily={selectedPairDaily}
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
            <FriendNatalTab
              bigThreeRows={selectedFriendBigThreeDisplayRows}
              birthTimeUnknown={selectedChart.birthTimeUnknown}
              emptyHouseRows={selectedFriendEmptyHouseViewRows}
              friendName={selectedChart.displayName}
              hasNatalChart={Boolean(selectedFriendReadyNatalChart)}
              isEventChart={Boolean(selectedChartIsEvent)}
              isNatalChartRepairing={selectedFriendNatalChartRepairing}
              onOpenEmptyHouse={openFriendEmptyHouseDetail}
              onOpenPattern={openFriendNatalAspectPatternDetail}
              onOpenPlacement={openFriendNatalPlacementDetail}
              patternItems={selectedFriendNatalAspectPatternItems}
              patternStatus={selectedFriendNatalAspectPatternStatus}
              patternTitle={`Patterns in ${possessiveLabel(selectedChart.displayName)} chart`}
              placementRows={selectedFriendNatalPlacementRows}
            />
          )}

          {friendProfileTab === "transits" && (
            <FriendTransitsTab
              bondTransits={selectedBondTransitViewCards}
              isLoading={currentSkyLoading}
              dailyForecast={selectedFriendDailyForecast}
              dailyDoItems={selectedFriendDailyDoDont?.do ?? []}
              dailyDontItems={selectedFriendDailyDoDont?.dont ?? []}
              dateLabel={transitDateLabel}
              friendName={selectedChart.displayName}
              houseTransits={selectedFriendHouseTransitViewCards}
              onOpenBondTransit={openBondTransitById}
              onOpenHouseTransit={openFriendHouseTransitById}
              onOpenPersonalTransit={openFriendTransitById}
              patternItems={currentSkyLoading ? [] : selectedFriendNatalAspectPatternItems}
              patternTimingOverrides={currentSkyLoading ? {} : selectedFriendNatalAspectPatternTimingOverrides}
              personalTransitGroups={selectedFriendPersonalTransitGroups}
            />
          )}

          {friendProfileTab === "synastry" && (
            <FriendSynastryTab
              contactGroups={selectedSynastryViewGroups}
              explainer={`Where ${possessiveLabel(selectedChart.displayName)} planets meet ${relationshipComparisonIsSelf ? "yours" : `${relationshipComparisonPossessive(relationshipComparisonName, relationshipComparisonIsSelf)} planets`} and what happens when they do. Why some things come easily between you and others take more work.`}
              friendName={selectedChart.displayName}
              innerIsSelf={relationshipComparisonIsSelf}
              innerName={relationshipComparisonName}
              innerSky={relationshipComparisonSky}
              onOpenContact={openFriendSynastryContactDetail}
              outerSky={selectedFriendReadyNatalChart}
            />
          )}

          {friendProfileTab === "composite" && (
            <FriendCompositeTab
              aspectGroups={selectedCompositeViewGroups}
              compositeAvailable={Boolean(selectedCompositeSky)}
              placementRows={selectedCompositePlacementRows}
              relationshipCompare={relationshipCompare}
              relationshipCompareStatus={relationshipCompareStatus}
            />
          )}
        </FriendDetail>
      )}
      </FriendsWorkspaceShell>
    </Suspense>
  );
}
