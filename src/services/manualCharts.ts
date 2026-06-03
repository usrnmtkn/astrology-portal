import { supabase } from "./auth";
import type { LocationInput, SkySnapshot } from "../types";

export type ManualChart = {
  id: string;
  ownerUserId: string;
  claimedByUserId?: string | null;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  relationshipType: string;
  birthDate: string;
  birthTime: string | null;
  birthTimeUnknown: boolean;
  birthPlace: string;
  birthLocation: LocationInput;
  natalChart?: SkySnapshot | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ManualChartInput = {
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  relationshipType: string;
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
};

const localManualChartsKey = (userId: string) => `tldrastro:manualCharts:${userId}`;

function rowToManualChart(row: ManualChartRow): ManualChart {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    claimedByUserId: row.claimed_by_user_id,
    displayName: row.display_name,
    firstName: row.first_name,
    lastName: row.last_name,
    relationshipType: row.relationship_type,
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
    updatedAt: row.updated_at
  };
}

function inputToRow(userId: string, input: ManualChartInput) {
  return {
    owner_user_id: userId,
    display_name: input.displayName,
    first_name: input.firstName ?? null,
    last_name: input.lastName ?? null,
    relationship_type: input.relationshipType || "friend",
    birth_date: input.birthDate,
    birth_time: input.birthTimeUnknown ? null : input.birthTime,
    birth_time_unknown: input.birthTimeUnknown,
    birth_place: input.birthPlace,
    birth_latitude: input.birthLocation.latitude,
    birth_longitude: input.birthLocation.longitude,
    birth_timezone: input.birthLocation.timeZone ?? null,
    natal_chart: input.natalChart ?? null,
    notes: input.notes ?? null
  };
}

function readLocalManualCharts(userId: string): ManualChart[] {
  try {
    const savedCharts = window.localStorage.getItem(localManualChartsKey(userId));
    const parsedCharts = savedCharts ? JSON.parse(savedCharts) as unknown : [];

    return Array.isArray(parsedCharts) ? parsedCharts as ManualChart[] : [];
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

function createLocalManualChart(userId: string, input: ManualChartInput): ManualChart {
  const now = new Date().toISOString();
  const nextChart: ManualChart = {
    ...input,
    id: `manual-${Date.now()}`,
    ownerUserId: userId,
    createdAt: now,
    updatedAt: now
  };
  const charts = [...readLocalManualCharts(userId), nextChart]
    .sort((first, second) => first.displayName.localeCompare(second.displayName));

  writeLocalManualCharts(userId, charts);
  return nextChart;
}

function updateLocalManualChart(userId: string, chartId: string, input: ManualChartInput): ManualChart {
  const charts = readLocalManualCharts(userId);
  const updatedAt = new Date().toISOString();
  const nextCharts = charts.map((chart) => (
    chart.id === chartId
      ? { ...chart, ...input, ownerUserId: userId, updatedAt }
      : chart
  )).sort((first, second) => first.displayName.localeCompare(second.displayName));
  const nextChart = nextCharts.find((chart) => chart.id === chartId);

  writeLocalManualCharts(userId, nextCharts);
  if (!nextChart) {
    throw new Error("Manual chart not found.");
  }

  return nextChart;
}

function deleteLocalManualChart(userId: string, chartId: string) {
  writeLocalManualCharts(
    userId,
    readLocalManualCharts(userId).filter((chart) => chart.id !== chartId)
  );
}

async function hasRemoteUser(userId: string) {
  if (!supabase) {
    return false;
  }

  const { data } = await supabase.auth.getUser();

  return data.user?.id === userId;
}

export async function listManualCharts(userId: string): Promise<ManualChart[]> {
  if (!(await hasRemoteUser(userId))) {
    return readLocalManualCharts(userId);
  }

  const client = supabase;

  if (!client) {
    return readLocalManualCharts(userId);
  }

  const { data, error } = await client
    .from("manual_charts")
    .select("*")
    .eq("owner_user_id", userId)
    .order("display_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data as ManualChartRow[]).map(rowToManualChart);
}

export async function createManualChart(userId: string, input: ManualChartInput): Promise<ManualChart> {
  if (!(await hasRemoteUser(userId))) {
    return createLocalManualChart(userId, input);
  }

  const client = supabase;

  if (!client) {
    return createLocalManualChart(userId, input);
  }

  const { data, error } = await client
    .from("manual_charts")
    .insert(inputToRow(userId, input))
    .select("*")
    .single();

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
      relationship_type: chart.relationshipType,
      created_from: "manual_chart"
    });

  if (connectionError) {
    throw connectionError;
  }

  return chart;
}

export async function updateManualChart(userId: string, chartId: string, input: ManualChartInput): Promise<ManualChart> {
  if (!(await hasRemoteUser(userId))) {
    return updateLocalManualChart(userId, chartId, input);
  }

  const client = supabase;

  if (!client) {
    return updateLocalManualChart(userId, chartId, input);
  }

  const { data, error } = await client
    .from("manual_charts")
    .update(inputToRow(userId, input))
    .eq("id", chartId)
    .eq("owner_user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await client
    .from("connections")
    .update({ relationship_type: input.relationshipType || "friend" })
    .eq("owner_user_id", userId)
    .eq("manual_chart_id", chartId);

  return rowToManualChart(data as ManualChartRow);
}

export async function deleteManualChart(userId: string, chartId: string): Promise<void> {
  if (!(await hasRemoteUser(userId))) {
    deleteLocalManualChart(userId, chartId);
    return;
  }

  const client = supabase;

  if (!client) {
    deleteLocalManualChart(userId, chartId);
    return;
  }

  await client
    .from("connections")
    .delete()
    .eq("owner_user_id", userId)
    .eq("manual_chart_id", chartId);

  const { error } = await client
    .from("manual_charts")
    .delete()
    .eq("id", chartId)
    .eq("owner_user_id", userId);

  if (error) {
    throw error;
  }
}
