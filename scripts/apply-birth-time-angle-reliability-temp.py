from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one occurrence, found {count}: {old[:120]!r}")
    file_path.write_text(text.replace(old, new, 1))


# SkySnapshot carries provenance independently of numeric angle fields.
replace_once(
    "apps/web/src/types.ts",
    "  ascendant: string;\n  ascendantLongitude?: number;",
    "  /** True only when this natal snapshot was calculated from an actual known birth time. */\n"
    "  birthTimeKnown?: boolean;\n"
    "  ascendant: string;\n"
    "  ascendantLongitude?: number;",
)

# Manual charts normalize old/remote snapshots through the provenance contract.
replace_once(
    "apps/web/src/services/manualCharts.ts",
    'import { natalChartHasCompletePlacements } from "./natalChartCompleteness";\n',
    'import { natalChartHasCompletePlacements } from "./natalChartCompleteness";\n'
    'import { natalSnapshotWithBirthTimeReliability } from "./birthTimeReliability";\n',
)
replace_once(
    "apps/web/src/services/manualCharts.ts",
    'function rowToManualChart(row: ManualChartRow): ManualChart {\n'
    '  const chartType = row.relationship_type === "event" ? "event" : "person";\n'
    '  const lastSyncedAt = row.last_synced_at ?? row.updated_at ?? row.created_at;\n\n'
    '  return {',
    'function rowToManualChart(row: ManualChartRow): ManualChart {\n'
    '  const chartType = row.relationship_type === "event" ? "event" : "person";\n'
    '  const lastSyncedAt = row.last_synced_at ?? row.updated_at ?? row.created_at;\n'
    '  const birthTimeKnown = !row.birth_time_unknown && Boolean(row.birth_time);\n\n'
    '  return {',
)
replace_once(
    "apps/web/src/services/manualCharts.ts",
    "    natalChart: row.natal_chart,\n",
    "    natalChart: natalSnapshotWithBirthTimeReliability(row.natal_chart, birthTimeKnown),\n",
)
replace_once(
    "apps/web/src/services/manualCharts.ts",
    'function normalizeLocalManualChart(chart: LocalManualChartRecord): ManualChart {\n'
    '  const chartType = chart.chartType ?? (chart.relationshipType === "event" ? "event" : "person");\n\n'
    '  return {',
    'function normalizeLocalManualChart(chart: LocalManualChartRecord): ManualChart {\n'
    '  const chartType = chart.chartType ?? (chart.relationshipType === "event" ? "event" : "person");\n'
    '  const birthTimeKnown = typeof chart.natalChart?.birthTimeKnown === "boolean"\n'
    '    ? chart.natalChart.birthTimeKnown\n'
    '    : !chart.birthTimeUnknown && Boolean(chart.birthTime);\n\n'
    '  return {',
)
replace_once(
    "apps/web/src/services/manualCharts.ts",
    '    relationshipType: chartType === "event" ? null : normalizeRelationshipContextKey(chart.relationshipType),\n'
    '    syncStatus: chart.syncStatus ?? "pending",',
    '    relationshipType: chartType === "event" ? null : normalizeRelationshipContextKey(chart.relationshipType),\n'
    '    natalChart: natalSnapshotWithBirthTimeReliability(chart.natalChart, birthTimeKnown),\n'
    '    syncStatus: chart.syncStatus ?? "pending",',
)
replace_once(
    "apps/web/src/services/manualCharts.ts",
    'export function manualChartNeedsBirthTime(chart: ManualChart) {\n'
    '  return chart.chartType !== "event" && (chart.birthTimeUnknown || !chart.birthTime);\n'
    '}',
    'export function manualChartHasReliableBirthTime(chart: ManualChart) {\n'
    '  if (typeof chart.natalChart?.birthTimeKnown === "boolean") {\n'
    '    return chart.natalChart.birthTimeKnown;\n'
    '  }\n\n'
    '  return !chart.birthTimeUnknown && Boolean(chart.birthTime);\n'
    '}\n\n'
    'export function manualChartNeedsBirthTime(chart: ManualChart) {\n'
    '  return chart.chartType !== "event" && !manualChartHasReliableBirthTime(chart);\n'
    '}',
)
replace_once(
    "apps/web/src/services/manualCharts.ts",
    '  const birthTime = input.birthTimeUnknown ? null : normalizeBirthTime(input.birthTime);\n'
    '  const row = {',
    '  const birthTime = input.birthTimeUnknown ? null : normalizeBirthTime(input.birthTime);\n'
    '  const birthTimeKnown = !input.birthTimeUnknown && Boolean(birthTime);\n'
    '  const row = {',
)
replace_once(
    "apps/web/src/services/manualCharts.ts",
    "    natal_chart: natalChartWithPronouns(input.natalChart, pronouns),",
    "    natal_chart: natalChartWithPronouns(\n"
    "      natalSnapshotWithBirthTimeReliability(input.natalChart, birthTimeKnown),\n"
    "      pronouns\n"
    "    ),",
)

# Manual-chart calculation stores a sanitized snapshot when time is unknown.
replace_once(
    "apps/web/src/features/friends/useManualChartsController.ts",
    'import { twentyFourHourTimeToDisplay } from "../../services/chartTime";\n',
    'import { twentyFourHourTimeToDisplay } from "../../services/chartTime";\n'
    'import { natalSnapshotWithBirthTimeReliability } from "../../services/birthTimeReliability";\n',
)
replace_once(
    "apps/web/src/features/friends/useManualChartsController.ts",
    '''async function natalSkyWithAspectPatternsForStorage(
  natalSky: SkySnapshot,
  location: LocationInput,
  date: Date,
  timeKnown: boolean,
  enabled: boolean
) {
  if (!enabled) {
    return natalSky;
  }

  try {
    const aspectPatterns = await fetchNatalAspectPatternsWithCopy(location, date, { timeKnown });
    return skyWithNatalAspectPatternCopy(natalSky, aspectPatterns);
  } catch (error) {
    console.warn("Natal aspect-pattern summary could not be stored with this chart.", error);
    return natalSky;
  }
}''',
    '''async function natalSkyWithAspectPatternsForStorage(
  natalSky: SkySnapshot,
  location: LocationInput,
  date: Date,
  timeKnown: boolean,
  enabled: boolean
) {
  const reliableNatalSky = natalSnapshotWithBirthTimeReliability(natalSky, timeKnown) ?? natalSky;

  if (!enabled) {
    return reliableNatalSky;
  }

  try {
    const aspectPatterns = await fetchNatalAspectPatternsWithCopy(location, date, { timeKnown });
    return skyWithNatalAspectPatternCopy(reliableNatalSky, aspectPatterns);
  } catch (error) {
    console.warn("Natal aspect-pattern summary could not be stored with this chart.", error);
    return reliableNatalSky;
  }
}''',
)

# Social charts preserve time-known provenance without exposing the raw time.
replace_once(
    "apps/web/src/services/socialFriends.ts",
    'import { getSupabaseClient, getVerifiedAuthUser } from "./auth";\n',
    'import { getSupabaseClient, getVerifiedAuthUser } from "./auth";\n'
    'import { natalSnapshotBirthTimeIsKnown, natalSnapshotWithBirthTimeReliability } from "./birthTimeReliability";\n',
)
replace_once(
    "apps/web/src/services/socialFriends.ts",
    '''export function friendSafeNatalChart(chart: SkySnapshot | null | undefined): SkySnapshot | null {
  if (!chart) {
    return null;
  }

  return {
    ...chart,
    location: {
      label: "Private birth location",
      latitude: 0,
      longitude: 0
    },
    generatedAt: "",
    solarDaylight: undefined,
    moonEvent: undefined,
    moonSignTransition: undefined
  };
}''',
    '''export function friendSafeNatalChart(
  chart: SkySnapshot | null | undefined,
  birthTimeKnown = false
): SkySnapshot | null {
  const reliableChart = natalSnapshotWithBirthTimeReliability(chart, birthTimeKnown);

  if (!reliableChart) {
    return null;
  }

  return {
    ...reliableChart,
    location: {
      label: "Private birth location",
      latitude: 0,
      longitude: 0
    },
    generatedAt: "",
    solarDaylight: undefined,
    moonEvent: undefined,
    moonSignTransition: undefined
  };
}''',
)
replace_once(
    "apps/web/src/services/socialFriends.ts",
    '''export async function syncOwnSocialProfile({
  displayName,
  avatarUrl,
  natalChart
}: {
  displayName: string;
  avatarUrl?: string;
  natalChart: SkySnapshot | null;
}): Promise<SocialProfile> {''',
    '''export async function syncOwnSocialProfile({
  displayName,
  avatarUrl,
  natalChart,
  birthTimeKnown
}: {
  displayName: string;
  avatarUrl?: string;
  natalChart: SkySnapshot | null;
  birthTimeKnown: boolean;
}): Promise<SocialProfile> {''',
)
replace_once(
    "apps/web/src/services/socialFriends.ts",
    "      natal_chart_input: friendSafeNatalChart(natalChart)\n",
    "      natal_chart_input: friendSafeNatalChart(natalChart, birthTimeKnown)\n",
)
replace_once(
    "apps/web/src/services/socialFriends.ts",
    '''export function socialFriendToChart(friend: ConnectedSocialFriend): ManualChart {
  const now = friend.acceptedAt || new Date().toISOString();

  return {
    id: socialFriendChartId(friend.userId),''',
    '''export function socialFriendToChart(friend: ConnectedSocialFriend): ManualChart {
  const now = friend.acceptedAt || new Date().toISOString();
  const birthTimeKnown = natalSnapshotBirthTimeIsKnown(friend.natalChart);
  const natalChart = natalSnapshotWithBirthTimeReliability(friend.natalChart, birthTimeKnown);

  return {
    id: socialFriendChartId(friend.userId),''',
)
replace_once(
    "apps/web/src/services/socialFriends.ts",
    '    birthTime: "12:00",\n    birthTimeUnknown: false,',
    '    birthTime: null,\n    birthTimeUnknown: !birthTimeKnown,',
)
replace_once(
    "apps/web/src/services/socialFriends.ts",
    "    natalChart: friend.natalChart,",
    "    natalChart,",
)

# Friend natal UI omits angles and houses entirely when time is unknown.
replace_once(
    "apps/web/src/features/friends/FriendNatalTab.tsx",
    '''  const placementTitle = isEventChart ? "Event placements" : `${friendName}'s natal placements`;

  if (isNatalChartRepairing) {''',
    '''  const placementTitle = isEventChart ? "Event placements" : `${friendName}'s natal placements`;
  const unreliableAngleLabels = new Set(["Ascendant", "Descendant", "Midheaven", "MC", "Imum Coeli", "IC"]);
  const visibleBigThreeRows = birthTimeUnknown
    ? bigThreeRows.filter((row) => !unreliableAngleLabels.has(row.label))
    : bigThreeRows;
  const visiblePlacementRows = birthTimeUnknown
    ? placementRows.filter((row) => !unreliableAngleLabels.has(row.label))
    : placementRows;
  const visibleEmptyHouseRows = birthTimeUnknown ? [] : emptyHouseRows;

  if (isNatalChartRepairing) {''',
)
replace_once("apps/web/src/features/friends/FriendNatalTab.tsx", "          {bigThreeRows.map((row) => {", "          {visibleBigThreeRows.map((row) => {")
replace_once("apps/web/src/features/friends/FriendNatalTab.tsx", "              rows={placementRows}\n", "              rows={visiblePlacementRows}\n")
replace_once("apps/web/src/features/friends/FriendNatalTab.tsx", "            {emptyHouseRows.length > 0 && (", "            {visibleEmptyHouseRows.length > 0 && (")
replace_once("apps/web/src/features/friends/FriendNatalTab.tsx", "                  {emptyHouseRows.map((row) => (", "                  {visibleEmptyHouseRows.map((row) => (")

# App-wide consumers must require provenance, never infer reliability from numeric angles.
app_path = Path("apps/web/src/App.tsx")
app = app_path.read_text()


def app_replace(old: str, new: str) -> None:
    global app
    count = app.count(old)
    if count != 1:
        raise SystemExit(f"App.tsx: expected exactly one occurrence, found {count}: {old[:120]!r}")
    app = app.replace(old, new, 1)


app_replace(
    "  validChartBirthDate,\n  validChartBirthTime,\n",
    "  chartBirthTimeIsKnown,\n  validChartBirthDate,\n  validChartBirthTime,\n",
)
app_replace(
    '''import {
  listLocalManualChartUserIds,
  migrateLocalManualChartsToRemote
} from "./services/manualCharts";''',
    '''import {
  listLocalManualChartUserIds,
  manualChartHasReliableBirthTime,
  migrateLocalManualChartsToRemote
} from "./services/manualCharts";''',
)
marker = 'import { normalizeBirthTime, twentyFourHourTimeToDisplay } from "./services/chartTime";\n'
app_replace(marker, marker + 'import { natalSnapshotWithBirthTimeReliability } from "./services/birthTimeReliability";\n')

app_replace(
    '''function timingContextForChart({
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
  const fallbackHouse = age === null ? null : (age % 12) + 1;''',
    '''function timingContextForChart({
  birthDate,
  currentDate,
  ascendant,
  natalPositions,
  birthTimeKnown = false
}: {
  birthDate: string;
  currentDate: string;
  ascendant: string;
  natalPositions: PlanetPosition[];
  birthTimeKnown?: boolean;
}): FriendTimingContext {
  const age = completedAgeOnDate(birthDate, currentDate);

  if (!birthTimeKnown) {
    return {
      age,
      profectedHouse: null,
      profectedSign: "",
      lordOfYear: "",
      chartRuler: undefined,
      activeNatalPlanetsInProfectedSign: []
    };
  }

  const fallbackHouse = age === null ? null : (age % 12) + 1;''',
)
app_replace(
    '''function friendTimingContext(chart: ManualChart, currentSky: SkySnapshot): FriendTimingContext {
  return timingContextForChart({
    birthDate: chart.birthDate,
    currentDate: currentSky.generatedAt,
    ascendant: chart.natalChart?.ascendant ?? "",
    natalPositions: chart.natalChart?.positions ?? []
  });
}''',
    '''function friendTimingContext(chart: ManualChart, currentSky: SkySnapshot): FriendTimingContext {
  const birthTimeKnown = manualChartHasReliableBirthTime(chart);

  return timingContextForChart({
    birthDate: chart.birthDate,
    currentDate: currentSky.generatedAt,
    ascendant: birthTimeKnown ? chart.natalChart?.ascendant ?? "" : "",
    natalPositions: chart.natalChart?.positions ?? [],
    birthTimeKnown
  });
}''',
)
app_replace(
    '''function natalTransitTargets(natalSky: SkySnapshot) {
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
}''',
    '''function natalTransitTargets(natalSky: SkySnapshot, birthTimeKnown = false) {
  if (!birthTimeKnown || typeof natalSky.ascendantLongitude !== "number") {
    return natalSky.positions.filter((position) => !["Ascendant", "Descendant", "Midheaven", "Imum Coeli"].includes(position.planet));
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
}''',
)
app_replace(
    'function rankedProfileTransits(currentSky: SkySnapshot, natalSky: SkySnapshot, birthDate: string, sunriseOrb = DEFAULT_SUNRISE_ORB_DEGREES) {\n'
    '  const natalPositions = natalTransitTargets(natalSky);\n'
    '  const timing = timingContextForChart({\n'
    '    birthDate,\n'
    '    currentDate: currentSky.generatedAt,\n'
    '    ascendant: natalSky.ascendant,\n'
    '    natalPositions\n'
    '  });',
    'function rankedProfileTransits(currentSky: SkySnapshot, natalSky: SkySnapshot, birthDate: string, birthTimeKnown: boolean, sunriseOrb = DEFAULT_SUNRISE_ORB_DEGREES) {\n'
    '  const natalPositions = natalTransitTargets(natalSky, birthTimeKnown);\n'
    '  const timing = timingContextForChart({\n'
    '    birthDate,\n'
    '    currentDate: currentSky.generatedAt,\n'
    '    ascendant: birthTimeKnown ? natalSky.ascendant : "",\n'
    '    natalPositions,\n'
    '    birthTimeKnown\n'
    '  });',
)
app_replace(
    '''function rankedFriendTransits(currentSky: SkySnapshot, chart: ManualChart, sunriseOrb = DEFAULT_SUNRISE_ORB_DEGREES) {
  const timing = friendTimingContext(chart, currentSky);
  const natalPositions = chart.natalChart ? natalTransitTargets(chart.natalChart) : [];

  return dedupeTransitAxisContacts(rankedTransitItems(buildNatalTransitItems(currentSky.positions, natalPositions, sunriseOrb), timing));
}''',
    '''function rankedFriendTransits(currentSky: SkySnapshot, chart: ManualChart, sunriseOrb = DEFAULT_SUNRISE_ORB_DEGREES) {
  const birthTimeKnown = manualChartHasReliableBirthTime(chart);
  const timing = friendTimingContext(chart, currentSky);
  const natalPositions = chart.natalChart ? natalTransitTargets(chart.natalChart, birthTimeKnown) : [];

  return dedupeTransitAxisContacts(rankedTransitItems(buildNatalTransitItems(currentSky.positions, natalPositions, sunriseOrb), timing));
}''',
)
app_replace(
    'function transitWheelAspectLines(currentSky: SkySnapshot, natalSky: SkySnapshot | null, transits: TransitItem[]): InterChartAspectLine[] {',
    'function transitWheelAspectLines(currentSky: SkySnapshot, natalSky: SkySnapshot | null, transits: TransitItem[], birthTimeKnown = false): InterChartAspectLine[] {',
)
app_replace(
    '  const natalTargetsByPoint = new Map(natalTransitTargets(natalSky).map((position) => [position.planet, position]));',
    '  const natalTargetsByPoint = new Map(natalTransitTargets(natalSky, birthTimeKnown).map((position) => [position.planet, position]));',
)
app_replace(
    "  const primaryProfileBirthDate = validChartBirthDate(primaryProfileChart);\n",
    "  const primaryProfileBirthDate = validChartBirthDate(primaryProfileChart);\n"
    "  const primaryProfileBirthTimeKnown = chartBirthTimeIsKnown(primaryProfileChart);\n",
)
app_replace(
    '''      primaryProfileBirthDate,
      activeSunriseOrbDegrees
    ).map((transit) => enrichedById.get(transit.id) ?? transit);''',
    '''      primaryProfileBirthDate,
      primaryProfileBirthTimeKnown,
      activeSunriseOrbDegrees
    ).map((transit) => enrichedById.get(transit.id) ?? transit);''',
)
app_replace(
    "    primaryProfileBirthDate,\n    profileNatalSky,",
    "    primaryProfileBirthDate,\n    primaryProfileBirthTimeKnown,\n    profileNatalSky,",
)
app_replace(
    '''    const applyNatalSky = (natalSky: SkySnapshot) => {
      const natalBigThree = natalBigThreeFromSky(natalSky, unknownBirthTime);
      const nextTransits = sky
        ? rankedProfileTransits(sky, natalSky, birthDate, activeSunriseOrbDegrees)
        : [];

      setProfileNatalSky(natalSky);''',
    '''    const applyNatalSky = (natalSky: SkySnapshot) => {
      const reliableNatalSky = natalSnapshotWithBirthTimeReliability(natalSky, !unknownBirthTime) ?? natalSky;
      const natalBigThree = natalBigThreeFromSky(reliableNatalSky, unknownBirthTime);
      const nextTransits = sky
        ? rankedProfileTransits(sky, reliableNatalSky, birthDate, !unknownBirthTime, activeSunriseOrbDegrees)
        : [];

      setProfileNatalSky(reliableNatalSky);''',
)
app_replace(
    '      setProfileNatalCalculationError("");\n    };\n\n    if (cachedNatalSky) {',
    '      setProfileNatalCalculationError("");\n      return reliableNatalSky;\n    };\n\n    if (cachedNatalSky) {',
)
app_replace(
    "        applyNatalSky(natalSky);\n        writeCachedSkySnapshot(natalCacheKey, natalSky);",
    "        const reliableNatalSky = applyNatalSky(natalSky);\n        writeCachedSkySnapshot(natalCacheKey, reliableNatalSky);",
)
app_replace(
    "              const enrichedNatalSky = skyWithNatalAspectPatternCopy(natalSky, aspectPatterns);",
    "              const enrichedNatalSky = skyWithNatalAspectPatternCopy(reliableNatalSky, aspectPatterns);",
)
app_replace(
    '''          const natalSky = await getAstrodienstSky(resolvedBirthLocation, birthDateTime);
          const natalBigThree = natalBigThreeFromSky(natalSky, transitForm.unknownBirthTime);
          const nextTransits = sky
            ? rankedProfileTransits(sky, natalSky, nextBirthDate, activeSunriseOrbDegrees)
            : [];''',
    '''          const calculatedNatalSky = await getAstrodienstSky(resolvedBirthLocation, birthDateTime);
          const natalSky = natalSnapshotWithBirthTimeReliability(calculatedNatalSky, !transitForm.unknownBirthTime) ?? calculatedNatalSky;
          const natalBigThree = natalBigThreeFromSky(natalSky, transitForm.unknownBirthTime);
          const nextTransits = sky
            ? rankedProfileTransits(sky, natalSky, nextBirthDate, !transitForm.unknownBirthTime, activeSunriseOrbDegrees)
            : [];''',
)
app_replace(
    '    ? transitWheelAspectLines(currentSky, natalSky, aspectRows)\n',
    '    ? transitWheelAspectLines(currentSky, natalSky, aspectRows, !unknownBirthTime)\n',
)
app_replace(
    "        natalPositions: natalTransitTargets(natalSky)\n",
    "        natalPositions: natalTransitTargets(natalSky, true),\n        birthTimeKnown: true\n",
)
app_replace(
    '  const natalAscendantPosition = typeof natalSky?.ascendantLongitude === "number"\n',
    '  const natalAscendantPosition = !unknownBirthTime && typeof natalSky?.ascendantLongitude === "number"\n',
)
app_replace(
    '  const natalMidheavenBasePosition = typeof natalSky?.midheavenLongitude === "number"\n',
    '  const natalMidheavenBasePosition = !unknownBirthTime && typeof natalSky?.midheavenLongitude === "number"\n',
)
app_replace(
    "      avatarUrl: userProfile.avatarUrl,\n      natalChart: profileNatalSky\n",
    "      avatarUrl: userProfile.avatarUrl,\n      natalChart: profileNatalSky,\n"
    "      birthTimeKnown: chartBirthTimeIsKnown(userProfile.charts[0])\n",
)
app_replace(
    "          avatarUrl: profile.avatarUrl,\n          natalChart: null\n",
    "          avatarUrl: profile.avatarUrl,\n          natalChart: null,\n          birthTimeKnown: false\n",
)
app_path.write_text(app)

print("Applied birth-time angle reliability guards.")
