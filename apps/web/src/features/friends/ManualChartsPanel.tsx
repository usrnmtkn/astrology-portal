import { returnToArticleParent } from "../../services/articleNavigation";
import { compatibilityCardParagraphs } from "./compatibilityCardCopy";
import { FriendsFeed, type FriendsFeedCard } from "./FriendsFeed";
import { useFriendsFeedDailyPeaks, useFriendsFeedTiming } from "./useFriendsFeedTiming";
import { selectFriendsFeedTransits } from "./friendsFeedTransits";
import { personalDailyPeakLabel, precisePersonalOrb } from "../../services/personalDailyTransits";
import { useRelationshipForecast } from "./useRelationshipForecast";
import { FriendsPairForecast } from "./FriendsPairForecast";
import { friendsFeedPeople, readFriendsFeedFilter, saveFriendsFeedFilter, selectFriendsFeedPeople, type FriendsFeedFilter } from "./friendsFeedSources";
import { articleHistoryChangeEvent } from "../../services/articleNavigation";
import { useNatalReadingRoute } from "../../hooks/useNatalReadingRoute";
import { NatalInsightPage } from "../../components/NatalInsightPage";
import { NatalSectPage } from "../../components/NatalSectPage";
import { PortalVisibility } from "../../components/portalVisibility";
import { transitArticleDescription } from "../../services/transitArticleDescription";
import { connectionTransitContext } from "../../services/connectionTransitContext";
import { ConnectionTransitDisclosure } from "./ConnectionTransitDisclosure";
import { connectionActivationKey, connectionAspectWord, connectionPointTitle, CONNECTION_BRIDGE_PREFIX } from "../../content/connectionTransit";
import { useConnectionTransitSources, publishedConnectionCopy, connectionBridgeCopy } from "./connectionTransitSources";
import { connectionTransitReading } from "./connectionTransitReading";
import { PageLoading, PageLoadError } from "../../components/PageLoading";
import { FriendDetail } from "./FriendDetail";
import {
  Suspense,
  lazy,
  useContext,
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
import { FriendChartDeleteDialog } from "./FriendChartDeleteDialog";
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
  transitV3AuthoredCardForContentKey,
  SourceGapError as FallbackV3SourceGapError,
  transitSynastryFallbackRendererV3
} from "../../content/fallbackArchitectureV3Runtime";
import {
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
  zodiacLongitude,
  zodiacSignGlyphs
} from "../../services/chartMath";
import { groupAspectsByGiftLesson } from "../../services/aspectGiftLesson";
import { transitHouseContentKey } from "../../services/generatedContentKeys";
import type { LiveGeneratedContent } from "../../services/generatedContent";
import {
  manualChartHasReliableBirthTime,
  manualChartNeedsNatalRepair,
  type ManualChart
} from "../../services/manualCharts";
import {
  isSocialFriendChart,
  socialFriendChartId,
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
import {
  buildFriendTransitsBrief,
  type FriendBondTransitView,
  type FriendDailyForecastView,
  type FriendHouseTransitView,
  type FriendPersonalTransitGroup,
  type FriendTransitReaderSection
} from "./friendTransitsBrief";
import {
  friendDetailRoutePath,
  friendsRouteStateFromUrl,
  initialFriendsTab,
  registerFriendHandleRoute,
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
import { friendDetailHasReaderFacingContent } from "./friendDetailAvailability";
import { selectEligibleFriendTransits } from "./friendTransitEligibility";
import { scheduleFriendChartRepair } from "./friendChartLoading";
import { generateUserContent } from "../../services/userGeneratedContent";

function FriendChartRailPlaceholder() {
  return (
    <div className="relationship-detail-left friend-detail-chart-column friend-detail-chart-rail chart-layout__visual" aria-hidden="true">
      <div className="friend-synastry-wheel-shell">
        <div className="chart-shell">
          <div className="wheel natal-wheel friend-wheel chart-frame">
            <PageLoading layout="wheel" announce={false} message="Loading your chart…" />
          </div>
        </div>
      </div>
    </div>
  );
}

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
  import("./FriendProfileChartRail").then((module) => ({
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
  return <PageLoading message="Loading Friends…" />;
}

export function ManualChartsPanel({
  profile,
  profileHandle,
  currentSky,
  currentSkyLoading,
  transitCopyLoading = false,
  transitCopyError = false,
  onRetryTransitCopy,
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
  onSignIn,
  viewModel
}: {
  profile: UserProfile;
  profileHandle: string | null;
  currentSky: SkySnapshot | null;
  currentSkyLoading: boolean;
  transitCopyLoading?: boolean;
  transitCopyError?: boolean;
  onRetryTransitCopy?: () => void;
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
  onSignIn: (intent?: "login" | "create") => void;
  viewModel: typeof friendsViewModelDependencies;
}) {
  const {
    activationTimingOverridesForTransits,
    buildNatalTransitItems,
    natalTransitTargets,
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
    useContentRegistryRevision,
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

  function friendTransitTitle(transit: TransitItem, ownerName: string) {
    const transiting = [transit.transitPlanet, transit.transitSign ? `in ${transit.transitSign}` : ""].filter(Boolean).join(" ");
    const owner = ownerName === "you" ? "your" : possessiveLabel(ownerName);
    return `${transiting} ${transitAspectTechnicalVerb(transit.aspect)} ${owner} natal ${transit.natalPoint}`;
  }

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
    const directInventories = {
      reader: currentSky && profileNatalSky
        ? buildNatalTransitItems(currentSky.positions, natalTransitTargets(profileNatalSky, profileNatalSky.birthTimeKnown === true), sunriseOrbDegrees, currentSky.location.timeZone)
        : [],
      friend: currentSky && selectedFriendReadyNatalChart && selectedChart
        ? buildNatalTransitItems(currentSky.positions, natalTransitTargets(selectedFriendReadyNatalChart, manualChartHasReliableBirthTime(selectedChart)), sunriseOrbDegrees, currentSky.location.timeZone)
        : []
    };
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

    // Select exact authored copy consistently. Family variants apply only when
    // the exact aspect has no eligible record; repetition never replaces it.
    const groupCounts = new Map<string, number>();
    const friendPossessivePronoun = ownerDisplayPronouns(friendName, friendPronouns).possessiveAdjective;

    return groups.flatMap((group) => {
      const familyKey = `${group.transiting}:${bondEffectFamily(group.transiting, group.aspect)}`;
      const indexInGroup = groupCounts.get(familyKey) ?? 0;
      groupCounts.set(familyKey, indexInGroup + 1);
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
          window: timingRange
        });

        const activatedContacts = contactsForBondTransitGroup(group, contacts);
        const connectionContext = connectionTransitContext({
          activation: group.activation,
          endpointOwner: group.endpointOwner,
          contacts: activatedContacts,
          counterpartTransits: group.endpointOwner === "reader" ? directInventories.friend : directInventories.reader,
          friendName,
          windowLabel: timingRange,
          titleOf: friendTransitTitle,
          orbOf: transitOrbValue,
          aspectWord: transitAspectTechnicalVerb
        });
        return [{
          activation: group.activation,
          endpointOwner: group.endpointOwner,
          activatedContacts,
          connectionContext,
          id: `${group.key}-${group.activationId}`,
          effectFamily: bondEffectFamily(group.transiting, group.aspect) as "soft" | "hard",
          effectContentKey: rendered.contentKey,
          headline: friendTransitTitle(group.activation, group.endpointOwner === "reader" ? "you" : friendName),
          transitPlanet: group.activation.transitPlanet,
          transitSign: group.activation.transitSign ?? "",
          timingRange,
          body: rendered.parts.join("\n\n"),
          effectBody: rendered.parts[0] ?? "",
          activationBody: connectionContext.cardBody
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
          ? `${comparisonPossessive} ${planet} ${exactAspect.type} their ${planet} · orb ${precisePersonalOrb(exactAspect.orbValue)}`
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
        aspect: contact.aspect,
        title: rendered?.headline ?? `${contact.yourPoint.name} ${contact.aspect} ${contact.friendPoint.name}`,
        summary: rendered?.body ?? contact.summary,
        meta: rendered?.tag ?? precisePersonalOrb(contact.orb)
      };
    });
  }

  function compositeAspectSummary(
    aspect: { from: string; to: string; type: string; orb: number },
    generatedContent?: GeneratedContentMap
  ) {
    return normalizeCompositeAspectSurface(aspect, generatedContent, relationshipComparisonIsSelf ? selectedChart?.relationshipType : null).sections
      .map((section) => section.body).join("\n\n");
  }

  function compositePlacementRows(sky: SkySnapshot, generatedContent?: GeneratedContentMap): SocialPlacementRow[] {
    return socialPlacementRows(sky).map((row) => {
      const normalized = normalizeCompositePlacementSurface({
        planet: row.label, sign: row.sign, house: row.house
      }, generatedContent, relationshipComparisonIsSelf ? selectedChart?.relationshipType : null);
      const description = normalized.sections.map((section) => section.body).join("\n\n");
      return { ...row, description, detailAvailable: Boolean(description) };
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
      pills: article.pills,
      natalPlanetReading: article.natalPlanetReading,
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

  const portalsVisible = useContext(PortalVisibility);
  const friendRouteDetailRefreshKeyRef = useRef("");
  const [connectionNavigation, setConnectionNavigation] = useState(0);
  const [socialFriends, setSocialFriends] = useState<ConnectedSocialFriend[]>([]);
  const [feedSelection,setFeedSelection] = useState(() => ({owner:chartOwnerUserId,value:readFriendsFeedFilter(chartOwnerUserId)}));
  const feedFilter = feedSelection.owner === chartOwnerUserId ? feedSelection.value : readFriendsFeedFilter(chartOwnerUserId);
  const updateFeedFilter = (value:FriendsFeedFilter) => {
    setFeedSelection({owner:chartOwnerUserId,value});
    saveFriendsFeedFilter(chartOwnerUserId,value);
  };
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
  const [friendTransitReading, setFriendTransitReading] = useState<import("../../services/generatedContent").LiveGeneratedContent | null>(null);
  const [friendTransitReadingStatus, setFriendTransitReadingStatus] = useState<"idle" | "loading" | "ready" | "locked">("idle");
  const [openChartMenuId, setOpenChartMenuId] = useState<string | null>(null);
  const [deleteCandidateChart, setDeleteCandidateChart] = useState<ManualChart | null>(null);
  const allFriendCharts = useMemo(
    () => [...socialFriendCharts, ...charts],
    [charts, socialFriendCharts]
  );
  const editingChart = charts.find((chart) => chart.id === editingChartId) ?? null;
  const selectedChart = allFriendCharts.find((chart) => chart.id === selectedChartId) ?? null;
  const friendTransitReadingSelectionKey = `${selectedChart?.id ?? ""}|${currentSky?.generatedAt.slice(0, 10) ?? ""}`;
  const friendTransitReadingSelectionKeyRef = useRef(friendTransitReadingSelectionKey);
  friendTransitReadingSelectionKeyRef.current = friendTransitReadingSelectionKey;
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
    onCalculationReadinessChange(resolvedFriendsMainView === "feed" ? { currentSky: true, profileNatal: true } : friendCalculationReadiness({
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

    if (profileActive || resolvedFriendsMainView === "feed" || !chartsReady || allFriendCharts.length === 0) {
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
  const feedPeople = useMemo(() => selectFriendsFeedPeople(friendsFeedPeople(socialFriends,charts,chartOwnerUserId),feedFilter),[socialFriends,charts,chartOwnerUserId,feedFilter]);
  const dailyPeakRequests = currentSky && !currentSkyLoading
    ? (resolvedFriendsMainView === "feed" ? feedPeople : friendProfileWork.transits && selectedChart && selectedFriendReadyNatalChart && !selectedChartIsEvent
      ? [{ id: selectedChart.id, chart: selectedChart }] : []).map(person => ({ id: person.id,
        targets: natalTransitTargets(person.chart.natalChart!, manualChartHasReliableBirthTime(person.chart))
          .map(position => ({ planet: position.planet, longitude: position.longitude ?? zodiacLongitude(position) })) }))
    : [];
  const feedDailyPeaks = useFriendsFeedDailyPeaks(dailyPeakRequests, currentSky?.positions.map(position => position.planet) ?? [], currentSky?.generatedAt ?? "", currentSky?.location.timeZone ?? "UTC");
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
  const compositeContentRegistryVersion = useContentRegistryRevision();
  const selectedCompositePlacementRows = useMemo(() => (
    selectedCompositeSky
      ? compositePlacementRows(selectedCompositeSky, relationshipGeneratedContent)
      : []
  ), [compositeContentRegistryVersion, relationshipGeneratedContent, selectedCompositeSky, relationshipComparisonIsSelf, selectedChart?.relationshipType]);
  const selectedCompositeViewGroups = useMemo<FriendCompositeAspectGroup[]>(() => (
    selectedCompositeAspectGroups.map((group) => ({
      key: group.key,
      label: group.label,
      aspects: group.aspects.map((aspect) => ({
        from: aspect.from,
        type: aspect.type,
        to: aspect.to,
        orb: aspect.orb,
        summary: compositeAspectSummary(aspect, relationshipGeneratedContent)
      }))
    }))
  ), [
    relationshipComparisonIsSelf,
    relationshipComparisonName,
    relationshipGeneratedContent,
    selectedChart?.displayName,
    selectedChart?.relationshipType,
    selectedCompositeAspectGroups,
    compositeContentRegistryVersion
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
  const reserveFriendChartRail = selectedFriendHasChartRail || Boolean(
    selectedFriendReadyNatalChart && relationshipPersonB && selectedCompatibilityIsLoading
  );
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

  const renderFriendChartRail = Boolean(friendChartRailRenderKey) && renderedFriendChartRailKey === friendChartRailRenderKey;
  const selectedFriendTransitCandidates = useMemo(() => (
    (friendProfileWork.transits || friendProfileWork.compatibility) && currentSky && selectedChart && selectedFriendReadyNatalChart && !selectedChartIsEvent
      && (!friendProfileWork.transits || feedDailyPeaks.peaks?.has(selectedChart.id))
      ? (() => {
          const contacts = rankTransitsByLifeAreaFocus(rankedFriendTransits(currentSky, selectedChart, sunriseOrbDegrees,
            feedDailyPeaks.peaks?.get(selectedChart.id)), lifeAreaFocus);
          return [...contacts.filter(transit => transit.dailyPeak?.exactToday.length),
            ...dedupeSameBeatPersonalTransits(contacts.filter(transit => !transit.dailyPeak?.exactToday.length), currentSky.generatedAt)];
        })()
      : []
  ), [
    currentSky,
    friendProfileWork.compatibility,
    friendProfileWork.transits,
    lifeAreaFocus,
    selectedChart,
    selectedChartIsEvent,
    selectedFriendReadyNatalChart,
    sunriseOrbDegrees,
    feedDailyPeaks.peaks
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
          Math.max(8, selectedFriendTransitCandidates.filter(transit => transit.dailyPeak?.exactToday.length).length)
        )
      : []
  ), [
    currentSky,
    fallbackArchitectureV3Version,
    selectedChart,
    selectedFriendTransitCandidates
  ]);
  const selectedFriendTransitTiming = useFriendsFeedTiming(friendProfileWork.transits
    ? selectedFriendEligibleTransits.map(transit => ({ id: transit.id, transit })) : [],
    currentSky?.generatedAt ?? "", currentSky?.location.timeZone ?? "UTC");
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

    return currentSkyHouseActivations(currentSky, selectedFriendReadyNatalChart)
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
        // Reports receive each selected personal contact in its own lane with
        // full identity/timing. Do not also embed aspect readings in the house
        // context, whose parts do not carry those contact identities.
        const reportNormalized = normalizeTransitHouseSurface(
          transit, activation.house, timingRange, selectedChart.displayName, [], friendGeneratedContent
        );

        return {
          activation,
          contentKey: transitHouseContentKey(transit.transitPlanet, activation.house),
          normalized,
          reportNormalized,
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
    profileNatalSky,
    selectedFriendReadyNatalChart,
    sunriseOrbDegrees,
    selectedSynastryContacts
  ]);
  const connectionSourceKeys = selectedBondTransitCards.flatMap(card => card.activatedContacts.flatMap(contact => {
    const key = connectionActivationKey(normalizeContentIdPart(contact.yourPoint.name), normalizeFallbackV3Aspect(contact.aspect) ?? "", normalizeContentIdPart(contact.friendPoint.name));
    return key ? [key] : [];
  }));
  const { rows: connectionSources, publicationIdentity: connectionPublicationIdentity } = useConnectionTransitSources(connectionSourceKeys);
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
  const selectedBondTransitSections = useMemo(() => new Map(selectedBondTransitCards.map(card => {
    try {
    const reading = currentSky && selectedChart ? connectionTransitReading({
      transiting: normalizeContentIdPart(card.activation.transitPlanet), natal: normalizeContentIdPart(card.activation.natalPoint),
      aspect: normalizeFallbackV3Aspect(card.activation.aspect) ?? "", voice: card.endpointOwner === "reader" ? "you" : selectedChart.displayName,
      window: personalTransitPackageWindow(card.activation, currentSky.generatedAt)
    }, transitV3AuthoredCardForContentKey, normalizePersonalTransitSurface(card.activation, currentSky.generatedAt, card.endpointOwner === "reader" ? "you" : selectedChart.displayName).sections
      .find(section => section.slot === "meaning")?.sourceKeys ?? []) : null;
    return [card.id, acceptedOwnerApprovedTransitSections(
      reading ? [{ body: reading.body, sourceKeys: [reading.contentKey] }] : [], fallbackV3ApprovalLevelForContentKey)] as const;
    } catch(error) {
      if (!(error instanceof FallbackV3SourceGapError)) throw error;
      const unavailable: FriendTransitReaderSection[] = [];
      return [card.id, unavailable] as const;
    }
  })), [selectedBondTransitCards, currentSky?.generatedAt, selectedChart?.displayName, fallbackArchitectureV3Version]);
  const selectedBondTransitViewCards = useMemo<FriendBondTransitView[]>(() => (
    selectedBondTransitCards.map((card) => ({
      id: card.id,
      headline: card.headline,
      effectBody: card.effectBody,
      activationBody: card.activationBody,
      transitPlanet: card.transitPlanet,
      aspect: card.activation.aspect,
      detailAvailable: Boolean(selectedBondTransitSections.get(card.id)?.length)
    }))
  ), [selectedBondTransitCards, selectedBondTransitSections]);
  const selectedFriendHouseTransitViewCards = useMemo<FriendHouseTransitView[]>(() => (
    selectedFriendHouseTransitCards.map((card) => ({
      id: card.contentKey,
      contentKey: card.contentKey,
      transitPlanet: card.transit.transitPlanet,
      title: card.title,
      durationLabel: card.durationLabel,
      timingRange: card.timingRange,
      rowSummary: card.rowSummary,
      readerSections: acceptedOwnerApprovedTransitSections(
        card.reportNormalized.detailSections,
        fallbackV3ApprovalLevelForContentKey
      ).map(({ body, sourceKeys }) => ({ body, sourceKeys })),
      termLabel: longTransitPlanets.has(card.transit.transitPlanet) ? "Long-term" : "Short-term",
      keywords: houseLifeAreaKeywords(card.activation.house),
      house: card.activation.house,
      houseLabel: `${ordinalHouse(card.activation.house)} house`,
      detailAvailable: acceptedOwnerApprovedTransitSections(
        card.reportNormalized.detailSections,
        fallbackV3ApprovalLevelForContentKey
      ).length > 0
    }))
  ), [selectedFriendHouseTransitCards]);
  const selectedFriendPersonalTransitGroups = useMemo<FriendPersonalTransitGroup[]>(() => {
    if (!currentSky) {
      return [];
    }

    return (["short", "long"] as const).flatMap((durationClass) => {
      // Report sources, previews, and the opened article must use the same
      // searched window; the initial estimate can cross a civil-date boundary.
      const transits = selectedFriendEligibleTransits.flatMap((transit) => {
        const timing = selectedFriendTransitTiming.timings?.get(transit.id);
        return transit.term === durationClass && timing ? [{ ...transit, timing }] : [];
      });

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
            title: friendTransitTitle(transit, selectedChart.displayName),
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
            readerSections: acceptedOwnerApprovedTransitSections(
              normalized.sections,
              fallbackV3ApprovalLevelForContentKey
            ).map(({ body, sourceKeys }) => ({ body, sourceKeys })),
            orb: transit.orb,
            detailAvailable: acceptedOwnerApprovedTransitSections(
              normalized.sections,
              fallbackV3ApprovalLevelForContentKey
            ).length > 0,
            evidence: {
              transitPlanet: transit.transitPlanet,
              transitSign: transit.transitSign,
              aspect: transit.aspect,
              natalPoint: transit.natalPoint,
              natalSign: transit.natalSign,
              natalHouse: transit.natalHouse,
              direction: transit.direction,
              score: transit.score,
              significance: transit.significance,
              timingBonuses: transit.timingBonuses ?? [],
              contentKeys: normalized.sections.flatMap((section) => section.sourceKeys)
            }
          };
        })
      }];
    });
  }, [currentSky, fallbackArchitectureV3Version, relationshipGeneratedContent, selectedChart, selectedFriendEligibleTransits, selectedFriendTransitTiming.timings]);
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
  const selectedFriendTransitsBrief = useMemo(() => buildFriendTransitsBrief({
    friendName: selectedChart?.displayName ?? "Friend",
    dateLabel: transitDateLabel,
    personalTransitGroups: selectedFriendPersonalTransitGroups,
    bondTransits: selectedBondTransitViewCards,
    houseTransits: selectedFriendHouseTransitViewCards,
    dailyForecast: selectedFriendDailyForecast,
    dailyDoItems: selectedFriendDailyDoDont?.do ?? [],
    dailyDontItems: selectedFriendDailyDoDont?.dont ?? [],
    patternItems: currentSkyLoading ? [] : selectedFriendNatalAspectPatternItems
  }), [
    currentSkyLoading,
    selectedBondTransitViewCards,
    selectedChart?.displayName,
    selectedFriendDailyDoDont,
    selectedFriendDailyForecast,
    selectedFriendHouseTransitViewCards,
    selectedFriendNatalAspectPatternItems,
    selectedFriendPersonalTransitGroups,
    transitDateLabel
  ]);
  const selectedFriendTransitReadingDate = currentSky?.generatedAt.slice(0, 10) ?? "";
  const selectedFriendTransitReadingAvailable = Boolean(
    selectedFriendTransitReadingDate
    && selectedChart
    && [...selectedFriendTransitsBrief.primaryThemes, ...selectedFriendTransitsBrief.longerCycles].length > 0
  );

  useEffect(() => {
    setFriendTransitReading(null);
    setFriendTransitReadingStatus("idle");
  }, [friendTransitReadingSelectionKey]);

  async function generateSelectedFriendTransitReading() {
    if (!selectedChart || !selectedFriendTransitReadingDate || !selectedFriendTransitReadingAvailable) return;
    const requestSelectionKey = friendTransitReadingSelectionKey;
    setFriendTransitReadingStatus("loading");
    try {
      const generated = await generateUserContent({
        subjectType: "friend_transit_reading",
        subjectId: selectedChart.id,
        contentKey: `friend-transit-reading/${selectedChart.id}/${selectedFriendTransitReadingDate}`,
        surface: "friends",
        mode: "in_depth",
        eventType: "friend-transit-reading",
        targetDate: selectedFriendTransitReadingDate,
        facts: {
          contentType: "friend_transit_reading",
          friendTransitsBrief: selectedFriendTransitsBrief
        }
      });
      if (friendTransitReadingSelectionKeyRef.current !== requestSelectionKey) return;
      if (!generated) throw new Error("The short reading was not returned.");
      setFriendTransitReading(generated);
      setFriendTransitReadingStatus("ready");
    } catch {
      if (friendTransitReadingSelectionKeyRef.current !== requestSelectionKey) return;
      setFriendTransitReading(null);
      setFriendTransitReadingStatus("locked");
    }
  }

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
  const openCompositePlacementDetail = (row: SocialPlacementRow) => {
    if (!selectedChart) return;
    openFriendDetail({
      routePath: friendDetailRoutePath(selectedChart.id, "composite", `placement-${row.id}`),
      glyph: row.glyph,
      kicker: "Composite",
      title: `${row.label} in ${row.sign}`,
      meta: typeof row.house === "number" ? `House ${row.house}` : "",
      plainBody: true,
      suppressTldr: true,
      body: (row.description ?? "").split(/\n{2,}/)
    });
  };
  const openCompositeAspectDetail = (aspect: FriendCompositeAspectGroup["aspects"][number]) => {
    if (!selectedChart) return;
    openFriendDetail({
      routePath: friendDetailRoutePath(selectedChart.id, "composite", `aspect-${aspect.from}-${aspect.type}-${aspect.to}`),
      aspectType: aspect.type,
      glyph: aspectGlyph(aspect.type),
      kicker: "Composite",
      title: `${aspect.from} ${aspect.type} ${aspect.to}`,
      meta: precisePersonalOrb(aspect.orb),
      plainBody: true,
      suppressTldr: true,
      body: aspect.summary.split(/\n{2,}/)
    });
  };
  useEffect(() => {
    const route = friendsRouteStateFromUrl();
    if (!route?.detail || route.view !== "composite" || route.chartId !== selectedChart?.id) return;
    const placement = selectedCompositePlacementRows.find((row) => `placement-${row.id}` === route.detail);
    if (placement) openCompositePlacementDetail(placement);
    const aspect = selectedCompositeViewGroups.flatMap((group) => group.aspects)
      .find((row) => `aspect-${row.from}-${row.type}-${row.to}` === route.detail);
    if (aspect) openCompositeAspectDetail(aspect);
  }, [selectedChart?.id, selectedCompositePlacementRows, selectedCompositeViewGroups]);

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
  useEffect(() => {
    const route = friendsRouteStateFromUrl();
    if (!route?.detail || route.view !== "compatibility" || route.chartId !== selectedChart?.id) return;
    const card = selectedCompatibilityCards.find(candidate => candidate.id === route.detail);
    if (!card) return;
    const refreshKey = `compatibility:${connectionNavigation}:${route.chartId}:${route.detail}:${fallbackArchitectureV3Version}`;
    if (friendRouteDetailRefreshKeyRef.current === refreshKey) return;
    friendRouteDetailRefreshKeyRef.current = refreshKey;
    openFriendCompatibilityCardDetail(card, compatibilityCardParagraphs(card));
  }, [connectionNavigation, selectedChart?.id, selectedCompatibilityCards, fallbackArchitectureV3Version]);
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
      aspectType: aspect.type,
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

      const sections = patternCopy.sections
        .map((section) => ({
          heading: resolvedNatalAspectPatternSectionLabel(section),
          body: section.body.trim()
        }))
        .filter((section): section is { heading: string; body: string } => Boolean(section.heading && section.body))
        .map((section) => ({
          heading: `${prefix}${section.heading}`,
          body: section.body
        }));
      return patternIndex === 0 ? sections : [
        { heading: `Supporting pattern: ${patternCopy.headline}`, body: patternCopy.overview },
        ...sections
      ];
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
  useEffect(() => {
    const route = friendsRouteStateFromUrl();
    if (!route?.detail || route.view !== "natal" || route.chartId !== selectedChart?.id || !selectedFriendReadyNatalChart) return;
    const refreshKey = `natal:${connectionNavigation}:${route.chartId}:${route.detail}:${selectedChart.updatedAt}:${selectedChart.displayName}:${fallbackArchitectureV3Version}`;
    if (friendRouteDetailRefreshKeyRef.current === refreshKey) return;
    const placement = selectedFriendPlacementRows.find(row => `natal-placement-${normalizeContentIdPart(row.label)}` === route.detail);
    if (placement && placement.detailAvailable !== false) {
      friendRouteDetailRefreshKeyRef.current = refreshKey;
      openFriendNatalPlacementDetail(placement);
      return;
    }
    const house = /^empty-house-([1-9]|1[0-2])$/u.exec(route.detail);
    if (house && selectedFriendEmptyHouses.includes(Number(house[1]))) {
      friendRouteDetailRefreshKeyRef.current = refreshKey;
      openFriendEmptyHouseDetail(Number(house[1]));
    }
  }, [connectionNavigation, selectedChart, selectedFriendReadyNatalChart, selectedFriendPlacementRows, selectedFriendEmptyHouses, fallbackArchitectureV3Version]);

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
      duration: card.timingRange,
      pills: { durationLabel: card.durationLabel, labels: [
        { label: longTransitPlanets.has(card.transit.transitPlanet) ? "Long-term" : "Short-term", tone: "term" as const },
        ...houseLifeAreaKeywords(card.activation.house).map((label) => ({ label, tone: "muted" as const }))
      ] },
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

    if (!currentSky) return;
    const transitAspect = normalizeFallbackV3Aspect(card.activation.aspect) ?? "";
    const voice = card.endpointOwner === "reader" ? "you" : selectedChart.displayName;
    const transitSections = selectedBondTransitSections.get(card.id) ?? [];
    if (!transitSections.length) return;
    const description = transitArticleDescription(
      card.activation,
      card.endpointOwner === "reader" ? profileNatalSky : selectedFriendReadyNatalChart,
      transitAspectTechnicalVerb(card.activation.aspect),
      voice
    );
    const connectionFacts = {
      heading: "",
      body: card.connectionContext.facts ? <ConnectionTransitDisclosure key={`${selectedChart.id}:${card.id}`}
        heading={`Why this involves ${selectedChart.displayName}`} facts={card.connectionContext.facts} description={description} /> : null
    };
    let activationCount = 0;
    const activatedConnectionSections = card.activatedContacts.flatMap(contact => {
      const yourPoint = normalizeContentIdPart(contact.yourPoint.name);
      const theirPoint = normalizeContentIdPart(contact.friendPoint.name);
      const aspect = normalizeFallbackV3Aspect(contact.aspect) ?? "";
      const key = connectionActivationKey(yourPoint, aspect, theirPoint);
      if (!key) return [];
      const variables = { holder1: selectedChart.displayName, transitPlanet: card.transitPlanet,
        transitAspectWord: connectionAspectWord(transitAspect),
        endpointPoint: connectionPointTitle(normalizeContentIdPart(card.activation.natalPoint)),
        yourPoint: connectionPointTitle(yourPoint), theirPoint: connectionPointTitle(theirPoint), synastryAspectWord: connectionAspectWord(aspect) };
      const body = publishedConnectionCopy(connectionSources, key, variables);
      if (!body) return [];
      const bridgeKey = `${CONNECTION_BRIDGE_PREFIX}${card.endpointOwner}-endpoint`;
      const bridge = connectionBridgeCopy(connectionSources, bridgeKey, variables);
      return [
        ...(bridge ? [{ heading: "", body: bridge, sourceKeys: [bridgeKey] }] : []),
        { eyebrow: activationCount++ === 0 ? "About these connections" : undefined,
          heading: `Your ${variables.yourPoint} ${variables.synastryAspectWord} ${selectedChart.displayName}'s ${variables.theirPoint}`,
          body, sourceKeys: [key] }
      ];
    });

    openFriendDetail({
      routePath: friendDetailRoutePath(
        selectedChart.id,
        "transits",
        `connection-transit-${normalizeContentIdPart(card.id)}`
      ),
      glyph: pointGlyph(card.transitPlanet),
      kicker: "Connection transit",
      title: card.headline,
      transitDescription: description,
      meta: [card.transitSign, card.timingRange].filter(Boolean).join(" · "),
      bodyBeforeSections: true,
      body: [card.effectBody, card.activationBody].filter(Boolean),
      sections: [
        { heading: "Personal transit", body: transitSections.map(section => section.body).join("\n\n") },
        connectionFacts, ...activatedConnectionSections
      ]
    });
  };
  const openBondTransitById = (cardId: string) => {
    const card = selectedBondTransitCards.find((candidate) => candidate.id === cardId);

    if (card) {
      openBondTransitDetail(card);
    }
  };
  const connectionDetailRevision = JSON.stringify([connectionPublicationIdentity, connectionSources.map(row => [row.content_key, row.id, row.updated_at])]);
  useEffect(() => {
    const route = friendsRouteStateFromUrl();
    if (!route?.detail?.startsWith("connection-transit-") || route.chartId !== selectedChart?.id || !currentSky) return;
    const card = selectedBondTransitCards.find(candidate => `connection-transit-${normalizeContentIdPart(candidate.id)}` === route.detail);
    if (!card) return;
    const refreshKey = `${connectionNavigation}:${route.chartId}:${route.detail}:${currentSky.generatedAt}:${fallbackArchitectureV3Version}:${connectionDetailRevision}`;
    if (friendRouteDetailRefreshKeyRef.current === refreshKey) return;
    friendRouteDetailRefreshKeyRef.current = refreshKey;
    openBondTransitDetail(card);
  }, [connectionNavigation, selectedChart?.id, selectedBondTransitCards, currentSky, fallbackArchitectureV3Version, connectionDetailRevision]);
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
      aspectType: contact.aspect,
      glyph: `${pointGlyph(contact.friendPoint.name)} ${aspectGlyph(contact.aspect)} ${pointGlyph(contact.yourPoint.name)}`,
      kicker: "Synastry",
      title,
      meta: `${subtitle.toUpperCase()} · ${precisePersonalOrb(contact.orb)}`,
      pills: { labels: [{ label: subtitle, tone: "muted" }] },
      body: rendered?.body ? [rendered.body] : [],
      content: emptyContentFallback(rendered?.templateKey ?? contact.contentKeys[0] ?? contact.id).bundle
    });
  };
  useEffect(() => {
    const route = friendsRouteStateFromUrl();
    if (!route?.detail || route.view !== "synastry" || route.chartId !== selectedChart?.id) return;
    const contact = selectedSynastryContacts.find(candidate => `synastry-${candidate.id}` === route.detail);
    if (!contact) return;
    const refreshKey = `synastry:${connectionNavigation}:${route.chartId}:${route.detail}:${fallbackArchitectureV3Version}`;
    if (friendRouteDetailRefreshKeyRef.current === refreshKey) return;
    friendRouteDetailRefreshKeyRef.current = refreshKey;
    openFriendSynastryContactDetail(contact.id);
  }, [connectionNavigation, selectedChart?.id, selectedSynastryContacts, fallbackArchitectureV3Version]);
  const openFriendTransitDetail = (transit: TransitItem) => {
    if (!currentSky || !selectedChart) {
      return;
    }

    const searchedTiming = selectedFriendTransitTiming.timings?.get(transit.id);
    if (!searchedTiming) return;
    transit = { ...transit, timing: searchedTiming };
    const timing = transitItemTimingDisplay(transit, currentSky.generatedAt);
    const normalized = normalizePersonalTransitSurface(
      transit,
      currentSky.generatedAt,
      selectedChart.displayName
    );
    const title = friendTransitTitle(transit, selectedChart.displayName);
    const orbLabel = precisePersonalOrb(transitOrbValue(transit));
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
      aspectType: transit.aspect,
      title,
      duration: transit.dailyPeak?.exactToday.length ? personalDailyPeakLabel(transit.dailyPeak) : timing.rangeLabel,
      pills: { durationLabel: timing.durationLabel },
      meta: [
        transit.dailyPeak?.exactToday.length ? personalDailyPeakLabel(transit.dailyPeak) : "",
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
      transitDescription: `${transitArticleDescription(
        transit,
        selectedFriendReadyNatalChart,
        transitAspectTechnicalVerb(transit.aspect),
        selectedChart.displayName
      )} Orb: ${orbLabel}.${directionSentence}`
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
    if (!selectedFriendTransitTiming.timings?.has(transit.id)) return;

    const refreshKey = [
      connectionNavigation,
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
    connectionNavigation,
    currentSky,
    fallbackArchitectureV3Version,
    selectedChart?.id,
    selectedFriendEligibleTransits,
    selectedFriendTransitTiming.timings
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
    setConnectionNavigation(value => value + 1);

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
    for (const friend of socialFriends) {
      registerFriendHandleRoute(friend.handle, socialFriendChartId(friend.userId));
    }
    const routeState = friendsRouteStateFromUrl();
    if (
      !routeState?.chartId
      || !socialFriendCharts.some((chart) => chart.id === routeState.chartId)
    ) {
      return;
    }

    // A direct shared profile can resolve before its authorized chart arrives,
    // or lose selection while the unrelated manual-chart list hydrates.
    if (selectedChartId !== routeState.chartId) setSelectedChartId(routeState.chartId);
    if (friendsMainView !== "profile") setFriendsMainView("profile");
    if (friendProfileTab !== routeState.view) setFriendProfileTab(routeState.view);
  }, [socialFriends, socialFriendCharts, selectedChartId, friendsMainView, friendProfileTab]);

  useEffect(() => {
    const requestedTab = activeFriendProfileContentRequest({
      activeTab: friendProfileTab,
      profileActive: resolvedFriendsMainView === "profile" && Boolean(selectedChart)
    });
    if (resolvedFriendsMainView === "feed") onFriendProfileContentRequest("transits");
    else if (requestedTab) onFriendProfileContentRequest(requestedTab);
  }, [friendProfileTab, onFriendProfileContentRequest, resolvedFriendsMainView, selectedChart?.id]);

  useEffect(() => {
    function handleArticleHistoryChange() {
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

    window.addEventListener(articleHistoryChangeEvent, handleArticleHistoryChange);

    return () => {
      window.removeEventListener(articleHistoryChangeEvent, handleArticleHistoryChange);
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
    if (!openChartMenuId || !portalsVisible) {
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
  }, [openChartMenuId, portalsVisible]);

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

  function openFriendProfile(chart: ManualChart, view: FriendProfileTab = "compatibility", detail?: string) {
    setOpenChartMenuId(null);
    requestFriendProfileTab(chart.chartType === "event" ? "natal" : view);
    setSelectedChartId(chart.id);
    setFriendProfileTab(chart.chartType === "event" ? "natal" : view);
    setRelationshipComparisonChartId("self");
    setRelationshipComparisonPickerOpen(false);
    setFriendsMainView("profile");
    updateFriendProfileUrl(chart.id, chart.chartType === "event" ? "natal" : view, "push", detail);
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
  const sectRoute = useNatalReadingRoute();

  const feedCandidates = useMemo(() => resolvedFriendsMainView === "feed" && currentSky && !transitCopyLoading && !transitCopyError && feedDailyPeaks.peaks
    ? feedPeople.flatMap(friend => {
      const chart = friend.chart;
      const contacts = rankTransitsByLifeAreaFocus(rankedFriendTransits(currentSky, chart, sunriseOrbDegrees, feedDailyPeaks.peaks?.get(friend.id)),lifeAreaFocus);
      const ongoing = new Set(dedupeSameBeatPersonalTransits(contacts.filter(transit => !transit.dailyPeak?.exactToday.length), currentSky.generatedAt));
      const candidates = contacts.filter(transit => transit.dailyPeak?.exactToday.length || ongoing.has(transit));
      return selectFriendsFeedTransits(candidates.flatMap(transit => {
        if (typeof transit.natalLongitude !== "number" || typeof transit.aspectDegrees !== "number") return [];
        const sections = acceptedOwnerApprovedTransitSections(normalizePersonalTransitSurface(transit, currentSky.generatedAt, friend.displayName).sections, fallbackV3ApprovalLevelForContentKey);
        const body = sections.map(section => section.body).join("\n\n");
        if (!body) return [];
        const titlePrefix = `${transit.transitPlanet}${transit.transitSign ? ` in ${transit.transitSign}` : ""} ${connectionAspectWord(transit.aspect)} `;
        return [{ id: `${friend.id}:${transit.id}`, friendId: friend.id, source:friend.source, friendName: friend.displayName, avatarUrl: friend.avatarUrl,
          title: `${titlePrefix}${possessiveLabel(friend.displayName)} natal ${transit.natalPoint}`, friendNameStart: titlePrefix.length,
          body, transit, chart, priorityIndex: contacts.indexOf(transit),
          dailyPeak: transit.dailyPeak,
          orb: precisePersonalOrb(transitOrbValue(transit)), aspect: normalizeFallbackV3Aspect(transit.aspect) }];
      }));
    }) : [], [resolvedFriendsMainView,currentSky,transitCopyLoading,transitCopyError,feedPeople,sunriseOrbDegrees,fallbackArchitectureV3Version,lifeAreaFocus,feedDailyPeaks.peaks]);
  const feedTiming=useFriendsFeedTiming(feedCandidates,currentSky?.generatedAt??"",currentSky?.location.timeZone??"UTC");
  const pairForecast=useRelationshipForecast(feedPeople,profileNatalSky,currentSky?.generatedAt??new Date().toISOString(),currentSky?.location.timeZone??"UTC",resolvedFriendsMainView==="feed" && Boolean(currentSky),profile.charts[0]?.birthDate??"");
  const feedCards:FriendsFeedCard[]=feedCandidates.flatMap(card=>{
    const timing=feedTiming.timings?.get(card.id);
    if(!timing||!currentSky)return [];
    const sections=acceptedOwnerApprovedTransitSections(normalizePersonalTransitSurface({...card.transit,timing},currentSky.generatedAt,card.friendName).sections,fallbackV3ApprovalLevelForContentKey);
    const body=sections.map(section=>section.body).join("\n\n");
    return body?[{...card,body,exactAt:card.transit.dailyPeak?.exactToday ?? [],startsAt:timing.engagementStart,endsAt:timing.engagementEnd,onOpen:()=>openFriendProfile(card.chart,"transits",`transit-${normalizeContentIdPart(card.transit.id)}`)}]:[];
  });

  if (sectRoute?.audience === "they") {
    const matches = selectedChart?.id === sectRoute.chartId;
    const ReadingPage = sectRoute.kind === "sect" ? NatalSectPage : NatalInsightPage;
    return <ReadingPage snapshot={matches && !selectedChart.birthTimeUnknown && !selectedChartIsEvent ? selectedFriendReadyNatalChart : null}
      audience="they" ownerName={matches ? selectedChart.displayName : undefined} chartId={sectRoute.chartId ?? undefined}
      loading={isLoadingCharts || matches && selectedFriendNatalChartRepairing} />;
  }

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
        backLabel={typeof window.history.state?.articleParent === "string" && new URL(window.history.state.articleParent,window.location.href).searchParams.has("flowPair") ? "Feed" : "Charts"}
        onBackToCharts={() => { if (!returnToArticleParent()) selectFriendsTab("charts"); }}
        socialPanelProps={{
          activeView: resolvedFriendsMainView === "profile" ? "charts" : resolvedFriendsMainView,
          chartCount: friendChartListItems.length,
          feedFilter,
          onFeedFilterChange:updateFeedFilter,
          feedContent: <FriendsFeed cards={feedCards} filter={feedFilter} now={currentSky?.generatedAt ?? new Date().toISOString()} timeZone={currentSky?.location.timeZone ?? "UTC"}
            pairForecast={<FriendsPairForecast key={chartOwnerUserId} pairs={pairForecast.pairs} readerName={profile.name} readerAvatar={profile.avatarUrl} ownerId={chartOwnerUserId} timeZone={currentSky?.location.timeZone??"UTC"} normalize={normalizePersonalTransitSurface} copyLoading={transitCopyLoading} copyError={transitCopyError} onRetryCopy={onRetryTransitCopy}
              loading={pairForecast.eligibleCount>0 && (profileNatalCalculationStatus==="loading" || profileNatalCalculationStatus==="idle")} error={pairForecast.eligibleCount>0 && profileNatalCalculationStatus==="error"}
              onRetry={pairForecast.retry} onOpenFriend={friend=>openFriendProfile(friend.chart)}/>}
            charts={allFriendCharts} chartsLoading={isLoadingCharts} onOpenChart={chart => openFriendProfile(chart, "natal")}
            loading={currentSkyLoading || transitCopyLoading || feedDailyPeaks.loading || feedTiming.loading || (feedFilter!=="circle" && isLoadingCharts)} error={transitCopyError || feedDailyPeaks.error || feedTiming.error} onRetry={()=>{feedDailyPeaks.retry();feedTiming.retry();onRetryTransitCopy?.();}} />,
          onAddChart: openAddChartModal,
          onFriendsChange: setSocialFriends,
          onOpenFriend: (friend) => openFriendProfile(socialFriendToChart(friend)),
          onPendingRequestCountChange,
          onSelectView: (view, historyMode) => selectFriendsTab(view, historyMode),
          onSignIn,
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
          restoreFocusId={editingChartId ? `friend-edit-${editingChartId}` : undefined}
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
        <FriendChartDeleteDialog
          name={deleteCandidateChart.displayName}
          restoreFocusId={`friend-menu-${deleteCandidateChart.id}`}
          pending={status === "deleting"}
          onClose={() => {
            if (status !== "deleting") {
              setDeleteCandidateChart(null);
            }
          }}
          onDelete={() => void removeChart(deleteCandidateChart)}
        />
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
            <Suspense fallback={<FriendChartRailPlaceholder />}>
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
                onOpenFullscreen={setRelationshipChartFullscreenMode}
                outerInitials={profileInitials(selectedChart.displayName, selectedChart.displayName)}
                relationshipComparisonSky={relationshipComparisonSky}
                synastryAspects={selectedSynastryAspectLines}
                transitAspects={selectedFriendTransitAspectLines}
              />
            </Suspense>
          ) : reserveFriendChartRail ? <FriendChartRailPlaceholder /> : null}
          className={`friend-profile-panel friend-focus-panel friend-profile-view friend-chart-page friend-chart-page--${friendProfileTab} chart-layout friend-detail-layout relationship-detail-layout${reserveFriendChartRail ? "" : " relationship-detail-no-chart"}`}
          initials={profileInitials(selectedChart.displayName, selectedChart.displayName)}
          isEventChart={selectedChartIsEvent}
          moon={selectedFriendBigThree?.moon ?? "Pending"}
          name={selectedChart.displayName}
          editButtonId={`friend-edit-${selectedChart.id}`}
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

          <Suspense fallback={<FeatureLoadingFallback />}>
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
                    <PageLoading compact message="Loading compatibility…" />
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
              chartId={selectedChart.id}
              natalSky={selectedFriendReadyNatalChart}
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

          {friendProfileTab === "transits" && (transitCopyError || feedDailyPeaks.error || selectedFriendTransitTiming.error
            ? <PageLoadError message="The transit readings could not load. Please try again." onRetry={() => { feedDailyPeaks.retry(); selectedFriendTransitTiming.retry(); onRetryTransitCopy?.(); }} />
            : <FriendTransitsTab
              brief={selectedFriendTransitsBrief}
              isLoading={currentSkyLoading || transitCopyLoading || feedDailyPeaks.loading || selectedFriendTransitTiming.loading}
              onGenerateReading={generateSelectedFriendTransitReading}
              onOpenBondTransit={openBondTransitById}
              onOpenHouseTransit={openFriendHouseTransitById}
              onOpenPersonalTransit={openFriendTransitById}
              patternTimingOverrides={currentSkyLoading || transitCopyLoading ? {} : selectedFriendNatalAspectPatternTimingOverrides}
              reading={friendTransitReading}
              readingAvailable={selectedFriendTransitReadingAvailable}
              readingStatus={friendTransitReadingStatus}
              readingSubjectId={selectedChart.id}
              readingTargetDate={selectedFriendTransitReadingDate}
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
              onPlacementClick={openCompositePlacementDetail}
              onAspectClick={openCompositeAspectDetail}
              relationshipCompare={relationshipCompare}
              relationshipCompareStatus={relationshipCompareStatus}
            />
          )}
          </Suspense>
        </FriendDetail>
      )}
      </FriendsWorkspaceShell>
    </Suspense>
  );
}
