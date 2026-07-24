import { getSupabaseClient } from "./auth";
import { defaultPronounChoice, normalizePronounChoice, type PronounChoice } from "./personReferences";
import { normalizeRelationshipContextKey, relationshipContextStorageKey } from "./relationshipContext";
import type { LocationInput, SkySnapshot } from "../types";

export type ManualChartType = "person" | "event";
export type ManualChartSyncStatus = "synced" | "pending" | "failed" | "conflict";

export type ManualChart = {
  id: string;
  ownerUserId: string;
  claimedByUserId?: string | null;
  chartType: ManualChartType;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  pronouns: PronounChoice;
  relationshipType?: string | null;
  birthDate: string;
  birthTime: string | null;
  birthTimeUnknown: boolean;
  birthPlace: string;
  birthLocation: LocationInput;
  natalChart?: SkySnapshot | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: ManualChartSyncStatus;
  syncError?: string | null;
  lastSyncedAt?: string | null;
};

export type ManualChartInput = {
  chartType: ManualChartType;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  pronouns?: PronounChoice | null;
  relationshipType?: string | null;
  birthDate: string;
  birthTime: string | null;
  birthTimeUnknown: boolean;
  birthPlace: string;
  birthLocation: LocationInput;
  natalChart?: SkySnapshot | null;
  notes?: string | null;
};

type ManualChartRow = {
  id: string;
  owner_user_id: string;
  claimed_by_user_id: string | null;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  pronouns?: string | null;
  relationship_type: string;
  birth_date: string;
  birth_time: string | null;
  birth_time_unknown: boolean;
  birth_place: string;
  birth_latitude: number;
  birth_longitude: number;
  birth_timezone: string | null;
  natal_chart: SkySnapshot | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sync_status?: string | null;
  sync_error?: string | null;
  last_synced_at?: string | null;
};

type LocalManualChartRecord = Omit<ManualChart, "chartType" | "syncStatus"> & {
  chartType?: ManualChartType;
  syncStatus?: ManualChartSyncStatus;
};

const localManualChartsKey = (userId: string) => `tldrastro:manualCharts:${userId}`;
const localManualChartsKeyPrefix = "tldrastro:manualCharts:";
const manualChartMetadataKey = "__tldrastroManualChart";

type ManualChartMetadataSnapshot = SkySnapshot & {
  [manualChartMetadataKey]?: {
    pronouns?: PronounChoice | null;
  };
};

function pronounsFromNatalChart(natalChart: SkySnapshot | null | undefined) {
  const metadata = (natalChart as ManualChartMetadataSnapshot | null | undefined)?.[manualChartMetadataKey];

  return metadata?.pronouns ?? null;
}

function natalChartWithPronouns(natalChart: SkySnapshot | null | undefined, pronouns: PronounChoice) {
  if (!natalChart) {
    return null;
  }

  const existingMetadata = (natalChart as ManualChartMetadataSnapshot)[manualChartMetadataKey] ?? {};

  return {
    ...natalChart,
    [manualChartMetadataKey]: {
      ...existingMetadata,
      pronouns
    }
  } as ManualChartMetadataSnapshot;
}

function isMissingManualChartPronounsColumn(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as { code?: unknown; message?: unknown };
  const message = typeof maybeError.message === "string" ? maybeError.message : "";

  return (
    (maybeError.code === "42703" && message.includes("manual_charts") && message.includes("pronouns")) ||
    (maybeError.code === "PGRST204" && message.includes("pronouns") && message.includes("manual_charts"))
  );
}

function rowToManualChart(row: ManualChartRow): ManualChart {
  const chartType = row.relationship_type === "event" ? "event" : "person";
  const lastSyncedAt = row.last_synced_at ?? row.updated_at ?? row.created_at;

  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    claimedByUserId: row.claimed_by_user_id,
    chartType,
    displayName: row.display_name,
    firstName: row.first_name,
    lastName: row.last_name,
    pronouns: normalizePronounChoice(row.pronouns ?? pronounsFromNatalChart(row.natal_chart)),
    relationshipType: chartType === "event" ? null : normalizeRelationshipContextKey(row.relationship_type),
    birthDate: row.birth_date,
    birthTime: row.birth_time,
    birthTimeUnknown: row.birth_time_unknown,
    birthPlace: row.birth_place,
    birthLocation: {
      label: row.birth_place,
      latitude: row.birth_latitude,
      longitude: row.birth_longitude,
      timeZone: row.birth_timezone ?? undefined
    },
    natalChart: row.natal_chart,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: "synced",
    syncError: null,
    lastSyncedAt
  };
}

function normalizeLocalManualChart(chart: LocalManualChartRecord): ManualChart {
  const chartType = chart.chartType ?? (chart.relationshipType === "event" ? "event" : "person");

  return {
    ...chart,
    chartType,
    pronouns: normalizePronounChoice(chart.pronouns),
    relationshipType: chartType === "event" ? null : normalizeRelationshipContextKey(chart.relationshipType),
    syncStatus: chart.syncStatus ?? "pending",
    syncError: chart.syncError ?? null,
    lastSyncedAt: chart.lastSyncedAt ?? null
  };
}

function inputToRow(userId: string, input: ManualChartInput, options: { omitPronounsColumn?: boolean; storageRelationship?: boolean } = {}) {
  const pronouns = normalizePronounChoice(input.pronouns);
  const row = {
    owner_user_id: userId,
    display_name: input.displayName,
    first_name: input.firstName ?? null,
    last_name: input.lastName ?? null,
    relationship_type: input.chartType === "event"
      ? "event"
      : options.storageRelationship
        ? relationshipContextStorageKey(input.relationshipType)
        : normalizeRelationshipContextKey(input.relationshipType),
    birth_date: input.birthDate,
    birth_time: input.birthTimeUnknown ? null : input.birthTime,
    birth_time_unknown: input.birthTimeUnknown,
    birth_place: input.birthPlace,
    birth_latitude: input.birthLocation.latitude,
    birth_longitude: input.birthLocation.longitude,
    birth_timezone: input.birthLocation.timeZone ?? null,
    natal_chart: natalChartWithPronouns(input.natalChart, pronouns),
    notes: input.notes ?? null
  };

  return options.omitPronounsColumn ? row : { ...row, pronouns };
}

function manualChartToInput(chart: ManualChart): ManualChartInput {
  return {
    chartType: chart.chartType,
    displayName: chart.displayName,
    firstName: chart.firstName ?? null,
    lastName: chart.lastName ?? null,
    pronouns: normalizePronounChoice(chart.pronouns),
    relationshipType: chart.chartType === "event" ? null : normalizeRelationshipContextKey(chart.relationshipType),
    birthDate: chart.birthDate,
    birthTime: chart.birthTimeUnknown ? null : chart.birthTime,
    birthTimeUnknown: chart.birthTimeUnknown,
    birthPlace: chart.birthPlace,
    birthLocation: chart.birthLocation,
    natalChart: chart.natalChart ?? null,
    notes: chart.notes ?? null
  };
}

function chartIdentity(chart: Pick<ManualChart, "chartType" | "displayName" | "birthDate" | "birthTime" | "birthTimeUnknown" | "birthPlace">) {
  return [
    chart.chartType,
    chart.displayName.trim().toLowerCase(),
    chart.birthDate,
    chart.birthTimeUnknown ? "time-unknown" : chart.birthTime ?? "",
    chart.birthPlace.trim().toLowerCase()
  ].join("|");
}

function chartIdentityFromInput(input: ManualChartInput) {
  return chartIdentity({
    chartType: input.chartType ?? "person",
    displayName: input.displayName,
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    birthTimeUnknown: input.birthTimeUnknown,
    birthPlace: input.birthPlace
  });
}

function dedupeManualCharts(charts: ManualChart[]) {
  const seen = new Set<string>();
  const dedupedCharts: ManualChart[] = [];

  charts.forEach((chart) => {
    const key = chartIdentity(chart);

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    dedupedCharts.push(chart);
  });

  return dedupedCharts.sort((first, second) => first.displayName.localeCompare(second.displayName));
}

function readLocalManualCharts(userId: string): ManualChart[] {
  try {
    const savedCharts = window.localStorage.getItem(localManualChartsKey(userId));
    const parsedCharts = savedCharts ? JSON.parse(savedCharts) as unknown : [];

    return Array.isArray(parsedCharts)
      ? (parsedCharts as LocalManualChartRecord[]).map(normalizeLocalManualChart)
      : [];
  } catch {
    return [];
  }
}

function writeLocalManualCharts(userId: string, charts: ManualChart[]) {
  try {
    window.localStorage.setItem(localManualChartsKey(userId), JSON.stringify(charts));
  } catch {
    return;
  }
}

function writeLocalManualChart(userId: string, chart: ManualChart) {
  const charts = [
    ...readLocalManualCharts(userId).filter((candidate) => (
      candidate.id !== chart.id && chartIdentity(candidate) !== chartIdentity(chart)
    )),
    chart
  ].sort((first, second) => first.displayName.localeCompare(second.displayName));

  writeLocalManualCharts(userId, charts);
  return chart;
}

function clearLocalManualCharts(userId: string) {
  try {
    window.localStorage.removeItem(localManualChartsKey(userId));
  } catch {
    return;
  }
}

function createLocalManualChart(userId: string, input: ManualChartInput): ManualChart {
  const now = new Date().toISOString();
  const chartType = input.chartType ?? "person";
  const normalizedInput = {
    ...input,
    chartType,
    relationshipType: chartType === "event" ? null : normalizeRelationshipContextKey(input.relationshipType)
  };
  const existingChart = localManualChartOwnerIds(userId)
    .flatMap((ownerId) => readLocalManualCharts(ownerId))
    .find((chart) => chartIdentity(chart) === chartIdentityFromInput(normalizedInput));

  if (existingChart) {
    return existingChart;
  }

  const nextChart: ManualChart = {
    ...normalizedInput,
    pronouns: normalizePronounChoice(input.pronouns ?? defaultPronounChoice),
    id: `manual-${Date.now()}`,
    ownerUserId: userId,
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
    syncError: null,
    lastSyncedAt: null
  };
  const charts = [...readLocalManualCharts(userId), nextChart]
    .sort((first, second) => first.displayName.localeCompare(second.displayName));

  writeLocalManualCharts(userId, charts);
  return nextChart;
}

function localManualChartOwnerIds(userId: string) {
  return [...new Set([userId, ...listLocalManualChartUserIds()])];
}

function findLocalManualChart(userId: string, chartId: string) {
  for (const ownerId of localManualChartOwnerIds(userId)) {
    const chart = readLocalManualCharts(ownerId).find((candidate) => candidate.id === chartId);

    if (chart) {
      return { ownerId, chart };
    }
  }

  return null;
}

function removeLocalManualChartsByIdentity(userIds: string[], identities: Set<string>) {
  userIds.forEach((ownerId) => {
    const nextCharts = readLocalManualCharts(ownerId).filter((chart) => (
      !identities.has(chartIdentity(chart))
    ));

    if (nextCharts.length === 0) {
      clearLocalManualCharts(ownerId);
      return;
    }

    writeLocalManualCharts(ownerId, nextCharts);
  });
}

function removeLocalManualChartsByIdOrIdentity(
  userIds: string[],
  ids: Set<string>,
  identities: Set<string>
) {
  userIds.forEach((ownerId) => {
    const nextCharts = readLocalManualCharts(ownerId).filter((chart) => (
      !ids.has(chart.id) && !identities.has(chartIdentity(chart))
    ));

    if (nextCharts.length === 0) {
      clearLocalManualCharts(ownerId);
      return;
    }

    writeLocalManualCharts(ownerId, nextCharts);
  });
}

function updateLocalManualChart(userId: string, chartId: string, input: ManualChartInput): ManualChart {
  const ownerIds = localManualChartOwnerIds(userId);
  const foundChart = findLocalManualChart(userId, chartId);
  const targetOwnerId = foundChart?.ownerId ?? userId;
  const charts = readLocalManualCharts(targetOwnerId);
  const existingChart = foundChart?.chart ?? charts.find((chart) => chart.id === chartId);
  const existingIdentity = existingChart ? chartIdentity(existingChart) : null;
  const updatedAt = new Date().toISOString();
  const chartType = input.chartType ?? "person";
  const normalizedInput = {
    ...input,
    chartType,
    relationshipType: chartType === "event" ? null : normalizeRelationshipContextKey(input.relationshipType)
  };
  const updatedIdentity = chartIdentityFromInput(normalizedInput);
  const updatedChart: ManualChart = {
    ...existingChart,
    ...normalizedInput,
    pronouns: normalizePronounChoice(input.pronouns),
    id: chartId,
    ownerUserId: targetOwnerId,
    createdAt: existingChart?.createdAt ?? updatedAt,
    updatedAt,
    syncStatus: "pending",
    syncError: null,
    lastSyncedAt: existingChart?.lastSyncedAt ?? null
  };
  const nextCharts = [
    ...charts.filter((chart) => (
      chart.id !== chartId && (
        (!existingIdentity || chartIdentity(chart) !== existingIdentity) &&
        chartIdentity(chart) !== updatedIdentity
      )
    )),
    updatedChart
  ].sort((first, second) => first.displayName.localeCompare(second.displayName));

  writeLocalManualCharts(targetOwnerId, nextCharts);
  removeLocalManualChartsByIdentity(
    ownerIds.filter((ownerId) => ownerId !== targetOwnerId),
    new Set([...(existingIdentity ? [existingIdentity] : []), updatedIdentity])
  );

  return updatedChart;
}

function deleteLocalManualChart(userId: string, chartId: string) {
  const deletedChart = findLocalManualChart(userId, chartId)?.chart ?? null;
  const deletedIdentity = deletedChart ? chartIdentity(deletedChart) : null;

  localManualChartOwnerIds(userId).forEach((ownerId) => {
    const nextCharts = readLocalManualCharts(ownerId).filter((chart) => (
      chart.id !== chartId && (!deletedIdentity || chartIdentity(chart) !== deletedIdentity)
    ));

    if (nextCharts.length === 0) {
      clearLocalManualCharts(ownerId);
      return;
    }

    writeLocalManualCharts(ownerId, nextCharts);
  });
}

export function listCachedManualCharts(userIds: string[]): ManualChart[] {
  return dedupeManualCharts(userIds.flatMap((userId) => readLocalManualCharts(userId)));
}

export function listLocalManualChartUserIds(): string[] {
  try {
    const userIds: string[] = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);

      if (!key?.startsWith(localManualChartsKeyPrefix)) {
        continue;
      }

      const userId = key.slice(localManualChartsKeyPrefix.length);

      if (userId) {
        userIds.push(userId);
      }
    }

    return userIds;
  } catch {
    return [];
  }
}

function deleteLocalManualChartCopies(userId: string, deletedChart: ManualChart) {
  const deletedIdentity = chartIdentity(deletedChart);
  const ownerIds = localManualChartOwnerIds(userId);

  removeLocalManualChartsByIdentity(ownerIds, new Set([deletedIdentity]));
}

function syncErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Remote chart save failed.";
}

function markLocalManualChartSyncError(
  userId: string,
  chart: ManualChart,
  error: unknown,
  syncStatus: Extract<ManualChartSyncStatus, "pending" | "failed">
) {
  const foundChart = findLocalManualChart(userId, chart.id);
  const ownerId = foundChart?.ownerId ?? userId;

  return writeLocalManualChart(ownerId, {
    ...(foundChart?.chart ?? chart),
    syncStatus,
    syncError: syncErrorMessage(error)
  });
}

function markLocalManualChartPending(userId: string, chart: ManualChart, error: unknown) {
  return markLocalManualChartSyncError(userId, chart, error, "pending");
}

function cacheConfirmedManualChart(userId: string, localChart: ManualChart, remoteChart: ManualChart) {
  removeLocalManualChartsByIdOrIdentity(
    localManualChartOwnerIds(userId),
    new Set([localChart.id, remoteChart.id]),
    new Set([chartIdentity(localChart), chartIdentity(remoteChart)])
  );

  return writeLocalManualChart(userId, {
    ...remoteChart,
    syncStatus: "synced",
    syncError: null,
    lastSyncedAt: remoteChart.lastSyncedAt ?? new Date().toISOString()
  });
}

function mergeRemoteManualCharts(userId: string, remoteCharts: ManualChart[]) {
  const ownerIds = localManualChartOwnerIds(userId);
  const remoteIdentities = new Set(remoteCharts.map(chartIdentity));
  const remoteIds = new Set(remoteCharts.map((chart) => chart.id));
  const pendingChartIds = new Set(
    ownerIds
      .flatMap((ownerId) => readLocalManualCharts(ownerId))
      .filter((chart) => (
        chart.syncStatus !== "synced" &&
        !remoteIdentities.has(chartIdentity(chart))
      ))
      .map((chart) => chart.id)
  );

  ownerIds.forEach((ownerId) => {
    const retainedLocalCharts = readLocalManualCharts(ownerId).filter((chart) => (
      !remoteIdentities.has(chartIdentity(chart)) &&
      !(chart.syncStatus === "synced" && remoteIds.has(chart.id))
    ));
    const nextCharts = ownerId === userId
      ? dedupeManualCharts([
          ...retainedLocalCharts,
          ...remoteCharts.filter((chart) => !pendingChartIds.has(chart.id))
        ])
      : retainedLocalCharts;

    if (nextCharts.length === 0) {
      clearLocalManualCharts(ownerId);
      return;
    }

    writeLocalManualCharts(ownerId, nextCharts);
  });

  const retainedLocalCharts = localManualChartOwnerIds(userId)
    .flatMap((ownerId) => readLocalManualCharts(ownerId));

  return dedupeManualCharts([
    ...retainedLocalCharts,
    ...remoteCharts.filter((chart) => !pendingChartIds.has(chart.id))
  ]);
}

function compareUpdatedAt(first: string, second: string) {
  const firstUpdatedAt = Date.parse(first);
  const secondUpdatedAt = Date.parse(second);

  if (Number.isFinite(firstUpdatedAt) && Number.isFinite(secondUpdatedAt)) {
    return firstUpdatedAt - secondUpdatedAt;
  }

  return first.localeCompare(second);
}

function compareManualChartUpdatedAt(first: ManualChart, second: ManualChart) {
  return compareUpdatedAt(first.updatedAt, second.updatedAt);
}

function pendingManualCharts(userId: string) {
  const seenIds = new Set<string>();
  const seenIdentities = new Set<string>();

  return localManualChartOwnerIds(userId)
    .flatMap((ownerId) => readLocalManualCharts(ownerId))
    .filter((chart) => chart.syncStatus === "pending" || chart.syncStatus === "failed")
    .sort((first, second) => compareManualChartUpdatedAt(second, first))
    .filter((chart) => {
      const identity = chartIdentity(chart);

      if (seenIds.has(chart.id) || seenIdentities.has(identity)) {
        return false;
      }

      seenIds.add(chart.id);
      seenIdentities.add(identity);
      return true;
    });
}

async function hasRemoteUser(userId: string) {
  const supabase = await getSupabaseClient();

  if (!supabase) {
    return false;
  }

  const { data } = await supabase.auth.getUser();

  return data.user?.id === userId;
}

async function listRemoteManualCharts(userId: string): Promise<ManualChart[]> {
  const client = await getSupabaseClient();

  if (!client) {
    throw new Error("Supabase auth is not configured.");
  }

  const { data, error } = await client
    .from("manual_charts")
    .select("*")
    .eq("owner_user_id", userId)
    .order("display_name", { ascending: true });

  if (error) {
    throw error;
  }

  return dedupeManualCharts((data as ManualChartRow[]).map(rowToManualChart));
}

async function insertRemoteManualChart(userId: string, input: ManualChartInput): Promise<ManualChart> {
  const client = await getSupabaseClient();

  if (!client) {
    throw new Error("Supabase auth is not configured.");
  }
  const remoteClient = client;
  const existingRemoteChart = (await listRemoteManualCharts(userId))
    .find((chart) => chartIdentity(chart) === chartIdentityFromInput(input));

  if (existingRemoteChart) {
    return existingRemoteChart;
  }

  async function insertManualChartRow(options: { omitPronounsColumn?: boolean } = {}) {
    return remoteClient
      .from("manual_charts")
      .insert(inputToRow(userId, input, { ...options, storageRelationship: true }))
      .select("*")
      .single();
  }

  let { data, error } = await insertManualChartRow();

  if (error && isMissingManualChartPronounsColumn(error)) {
    ({ data, error } = await insertManualChartRow({ omitPronounsColumn: true }));
  }

  if (error) {
    throw error;
  }

  const chart = rowToManualChart(data as ManualChartRow);
  const { error: connectionError } = await client
    .from("connections")
    .insert({
      owner_user_id: userId,
      manual_chart_id: chart.id,
      status: "active",
      relationship_type: chart.chartType === "event" ? "event" : relationshipContextStorageKey(chart.relationshipType),
      created_from: "manual_chart"
    });

  if (connectionError) {
    await client
      .from("manual_charts")
      .delete()
      .eq("id", chart.id)
      .eq("owner_user_id", userId);
    throw connectionError;
  }

  return chart;
}

export async function listManualCharts(userId: string): Promise<ManualChart[]> {
  const cachedOwnerIds = localManualChartOwnerIds(userId);

  try {
    if (!(await hasRemoteUser(userId))) {
      return listCachedManualCharts(cachedOwnerIds);
    }

    const remoteCharts = await listRemoteManualCharts(userId);

    return mergeRemoteManualCharts(userId, remoteCharts);
  } catch {
    return listCachedManualCharts(cachedOwnerIds);
  }
}

export async function createManualChart(userId: string, input: ManualChartInput): Promise<ManualChart> {
  const localChart = createLocalManualChart(userId, input);

  try {
    if (!(await hasRemoteUser(userId))) {
      return localChart;
    }

    const remoteChart = await insertRemoteManualChart(userId, input);

    return cacheConfirmedManualChart(userId, localChart, remoteChart);
  } catch (error) {
    return markLocalManualChartPending(userId, localChart, error);
  }
}

export async function migrateLocalManualChartsToRemote(userId: string, localUserIds: Array<string | null | undefined>) {
  if (!(await hasRemoteUser(userId))) {
    return { imported: 0, skipped: 0 };
  }

  const uniqueLocalUserIds = [...new Set(localUserIds.filter((id): id is string => Boolean(id)))];
  const localCharts = uniqueLocalUserIds.flatMap((localUserId) => readLocalManualCharts(localUserId));

  if (localCharts.length === 0) {
    return { imported: 0, skipped: 0 };
  }

  const remoteCharts = await listRemoteManualCharts(userId);
  const remoteIdentities = new Set(remoteCharts.map(chartIdentity));
  let imported = 0;
  let skipped = 0;

  for (const localChart of localCharts) {
    const identity = chartIdentity(localChart);

    if (remoteIdentities.has(identity)) {
      skipped += 1;
      continue;
    }

    const importedChart = await insertRemoteManualChart(userId, manualChartToInput(localChart));

    remoteIdentities.add(chartIdentity(importedChart));
    imported += 1;
  }

  uniqueLocalUserIds.forEach(clearLocalManualCharts);

  return { imported, skipped };
}

async function updateRemoteManualChart(
  userId: string,
  chartId: string,
  input: ManualChartInput,
  options: { localUpdatedAt?: string } = {}
): Promise<ManualChart> {
  const client = await getSupabaseClient();

  if (!client) {
    throw new Error("Supabase auth is not configured.");
  }
  const remoteClient = client;
  const { data: existingChartData, error: existingLookupError } = await client
    .from("manual_charts")
    .select("*")
    .eq("id", chartId)
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (existingLookupError) {
    throw existingLookupError;
  }

  if (!existingChartData) {
    return insertRemoteManualChart(userId, input);
  }

  const existingChart = existingChartData ? rowToManualChart(existingChartData as ManualChartRow) : null;
  const existingIdentity = existingChart ? chartIdentity(existingChart) : null;

  if (
    existingChart &&
    options.localUpdatedAt &&
    compareUpdatedAt(existingChart.updatedAt, options.localUpdatedAt) >= 0
  ) {
    return existingChart;
  }

  async function updateManualChartRow(rowOptions: { omitPronounsColumn?: boolean } = {}) {
    const updateQuery = remoteClient
      .from("manual_charts")
      .update(inputToRow(userId, input, { ...rowOptions, storageRelationship: true }))
      .eq("id", chartId)
      .eq("owner_user_id", userId);
    const guardedUpdateQuery = options.localUpdatedAt
      ? updateQuery.lte("updated_at", options.localUpdatedAt)
      : updateQuery;

    return guardedUpdateQuery
      .select("*")
      .maybeSingle();
  }

  let { data, error } = await updateManualChartRow();

  if (error && isMissingManualChartPronounsColumn(error)) {
    ({ data, error } = await updateManualChartRow({ omitPronounsColumn: true }));
  }

  if (error) {
    throw error;
  }

  if (!data) {
    const latestRemoteChart = (await listRemoteManualCharts(userId))
      .find((chart) => chart.id === chartId);

    if (latestRemoteChart) {
      return latestRemoteChart;
    }

    throw new Error("Manual chart was not found after its sync update.");
  }

  const { error: connectionError } = await client
    .from("connections")
    .update({ relationship_type: input.chartType === "event" ? "event" : relationshipContextStorageKey(input.relationshipType) })
    .eq("owner_user_id", userId)
    .eq("manual_chart_id", chartId);

  if (connectionError) {
    throw new Error(`Chart updated, but connection metadata could not be updated: ${connectionError.message}`);
  }

  const updatedChart = rowToManualChart(data as ManualChartRow);

  if (existingIdentity) {
    const { data: ownerChartData, error: ownerChartsError } = await client
      .from("manual_charts")
      .select("*")
      .eq("owner_user_id", userId);

    if (ownerChartsError) {
      throw ownerChartsError;
    }

    const updatedIdentity = chartIdentity(updatedChart);
    const duplicateChartIds = (ownerChartData as ManualChartRow[])
      .map(rowToManualChart)
      .filter((chart) => (
        chart.id !== updatedChart.id &&
        (chartIdentity(chart) === existingIdentity || chartIdentity(chart) === updatedIdentity)
      ))
      .map((chart) => chart.id);

    if (duplicateChartIds.length > 0) {
      const { error: duplicateConnectionDeleteError } = await client
        .from("connections")
        .delete()
        .eq("owner_user_id", userId)
        .in("manual_chart_id", duplicateChartIds);

      if (duplicateConnectionDeleteError) {
        throw duplicateConnectionDeleteError;
      }

      const { error: duplicateChartDeleteError } = await client
        .from("manual_charts")
        .delete()
        .eq("owner_user_id", userId)
        .in("id", duplicateChartIds);

      if (duplicateChartDeleteError) {
        throw duplicateChartDeleteError;
      }
    }
  }

  return updatedChart;
}

export async function updateManualChart(userId: string, chartId: string, input: ManualChartInput): Promise<ManualChart> {
  const localChart = updateLocalManualChart(userId, chartId, input);

  try {
    if (!(await hasRemoteUser(userId))) {
      return localChart;
    }

    const remoteChart = await updateRemoteManualChart(userId, chartId, input);

    return cacheConfirmedManualChart(userId, localChart, remoteChart);
  } catch (error) {
    return markLocalManualChartPending(userId, localChart, error);
  }
}

export async function flushManualChartSync(userId: string) {
  const pendingCharts = pendingManualCharts(userId);
  const result = {
    attempted: 0,
    synced: 0,
    failed: 0,
    conflictsResolved: 0
  };

  if (pendingCharts.length === 0) {
    return result;
  }

  try {
    if (!(await hasRemoteUser(userId))) {
      return result;
    }
  } catch (error) {
    pendingCharts.forEach((chart) => {
      markLocalManualChartSyncError(userId, chart, error, "failed");
    });

    return { ...result, attempted: pendingCharts.length, failed: pendingCharts.length };
  }

  let remoteCharts: ManualChart[];

  try {
    remoteCharts = await listRemoteManualCharts(userId);
  } catch (error) {
    pendingCharts.forEach((chart) => {
      markLocalManualChartSyncError(userId, chart, error, "failed");
    });

    return { ...result, attempted: pendingCharts.length, failed: pendingCharts.length };
  }

  for (const localChart of pendingCharts) {
    result.attempted += 1;

    try {
      const matchingRemoteCharts = remoteCharts.filter((remoteChart) => (
        remoteChart.id === localChart.id ||
        chartIdentity(remoteChart) === chartIdentity(localChart)
      ));
      const matchingRemoteChart = matchingRemoteCharts
        .sort((first, second) => compareManualChartUpdatedAt(second, first))[0];
      let confirmedRemoteChart: ManualChart;

      if (matchingRemoteChart && compareManualChartUpdatedAt(matchingRemoteChart, localChart) >= 0) {
        confirmedRemoteChart = matchingRemoteChart;
        result.conflictsResolved += 1;
      } else if (matchingRemoteChart) {
        confirmedRemoteChart = await updateRemoteManualChart(
          userId,
          matchingRemoteChart.id,
          manualChartToInput(localChart),
          { localUpdatedAt: localChart.updatedAt }
        );
        result.conflictsResolved += 1;
      } else {
        confirmedRemoteChart = await insertRemoteManualChart(userId, manualChartToInput(localChart));

        if (compareManualChartUpdatedAt(confirmedRemoteChart, localChart) < 0) {
          confirmedRemoteChart = await updateRemoteManualChart(
            userId,
            confirmedRemoteChart.id,
            manualChartToInput(localChart),
            { localUpdatedAt: localChart.updatedAt }
          );
        }
      }

      cacheConfirmedManualChart(userId, localChart, confirmedRemoteChart);
      remoteCharts = [
        ...remoteCharts.filter((chart) => (
          chart.id !== confirmedRemoteChart.id &&
          chartIdentity(chart) !== chartIdentity(confirmedRemoteChart)
        )),
        confirmedRemoteChart
      ];
      result.synced += 1;
    } catch (error) {
      markLocalManualChartSyncError(userId, localChart, error, "failed");
      result.failed += 1;
    }
  }

  return result;
}

export async function deleteManualChart(userId: string, chartId: string): Promise<void> {
  if (!(await hasRemoteUser(userId))) {
    deleteLocalManualChart(userId, chartId);
    return;
  }

  const client = await getSupabaseClient();

  if (!client) {
    deleteLocalManualChart(userId, chartId);
    return;
  }

  const { data: deletedChartData, error: lookupError } = await client
    .from("manual_charts")
    .select("*")
    .eq("id", chartId)
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  const deletedChart = deletedChartData ? rowToManualChart(deletedChartData as ManualChartRow) : null;
  let chartIdsToDelete = [chartId];

  if (deletedChart) {
    const deletedIdentity = chartIdentity(deletedChart);
    const { data: ownerChartData, error: ownerChartsError } = await client
      .from("manual_charts")
      .select("*")
      .eq("owner_user_id", userId);

    if (ownerChartsError) {
      throw ownerChartsError;
    }

    chartIdsToDelete = (ownerChartData as ManualChartRow[])
      .map(rowToManualChart)
      .filter((chart) => chart.id === chartId || chartIdentity(chart) === deletedIdentity)
      .map((chart) => chart.id);
  }

  const { error: connectionDeleteError } = await client
    .from("connections")
    .delete()
    .eq("owner_user_id", userId)
    .in("manual_chart_id", chartIdsToDelete);

  if (connectionDeleteError) {
    throw connectionDeleteError;
  }

  const { error } = await client
    .from("manual_charts")
    .delete()
    .eq("owner_user_id", userId)
    .in("id", chartIdsToDelete);

  if (error) {
    throw error;
  }

  if (deletedChart) {
    deleteLocalManualChartCopies(userId, deletedChart);
  } else {
    deleteLocalManualChart(userId, chartId);
  }
}
