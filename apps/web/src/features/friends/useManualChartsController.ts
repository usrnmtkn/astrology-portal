import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { twentyFourHourTimeToDisplay } from "../../services/chartTime";
import { natalSnapshotWithBirthTimeReliability } from "../../services/birthTimeReliability";
import {
  createManualChart,
  deleteManualChart,
  listCachedManualCharts,
  listManualCharts,
  manualChartNeedsNatalRepair,
  resolvedManualChartBirthLocationForRepair,
  updateManualChart
} from "../../services/manualCharts";
import type { ManualChart, ManualChartInput, ManualChartType } from "../../services/manualCharts";
import { natalChartWithReliableAngleLongitudes } from "../../services/natalAngleReliability";
import {
  fetchNatalAspectPatternsWithCopy,
  skyWithNatalAspectPatternCopy
} from "../../services/natalAspectPatterns";
import { defaultPronounChoice } from "../../services/personReferences";
import { normalizeRelationshipContextKey } from "../../services/relationshipContext";
import { withTimeZone, zonedDateTimeToUtc } from "../../services/timezones";
import type { LocationInput, SkySnapshot } from "../../types";
import {
  defaultManualChartForm,
  manualChartFormCopy,
  manualChartFormFromChart
} from "./manualChartForm";
import type { ManualChartForm } from "./manualChartForm";
import {
  enhanceFriendChartsAtomically,
  friendChartRepairBatch,
  scheduleFriendChartRepair
} from "./friendChartLoading";

type ManualChartsStatus = "idle" | "loading" | "saving" | "deleting";

type UseManualChartsControllerOptions = {
  allowCachedChartsWhileLoading: boolean;
  chartOwnerUserId: string;
  chartRefreshKey: number;
  chartsReady: boolean;
  profileId: string;
  showNatalAspectPatterns: boolean;
  socialFriendCharts: ManualChart[];
};

type SavedManualChart = {
  chart: ManualChart;
  wasEditing: boolean;
};

export type ManualChartsController = {
  charts: ManualChart[];
  editingChartId: string | null;
  form: ManualChartForm;
  formCopy: (typeof manualChartFormCopy)[ManualChartType];
  message: string;
  selectedChartId: string | null;
  setForm: Dispatch<SetStateAction<ManualChartForm>>;
  setSelectedChartId: Dispatch<SetStateAction<string | null>>;
  status: ManualChartsStatus;
  addBirthTime: (chart: ManualChart) => void;
  editChart: (chart: ManualChart) => void;
  removeChart: (chart: ManualChart) => Promise<boolean>;
  resetForm: (nextMessage?: string) => void;
  saveChart: (event: FormEvent<HTMLFormElement>) => Promise<SavedManualChart | null>;
  updateChartType: (chartType: ManualChartType) => void;
  updateField: <Key extends keyof ManualChartForm>(key: Key, value: ManualChartForm[Key]) => void;
};

function manualChartWithReliableAngleLongitudes(chart: ManualChart): ManualChart {
  const natalChart = natalChartWithReliableAngleLongitudes(chart.natalChart, chart.birthTimeUnknown);

  return natalChart === chart.natalChart
    ? chart
    : { ...chart, natalChart };
}

function manualChartsWithReliableAngleLongitudes(charts: ManualChart[]) {
  return charts.map(manualChartWithReliableAngleLongitudes);
}

async function calculateSky(location: LocationInput, date: Date) {
  const { getAstrodienstSky } = await import("../../services/ephemeris");
  return getAstrodienstSky(location, date);
}

async function natalSkyWithAspectPatternsForStorage(
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
}

export function useManualChartsController({
  allowCachedChartsWhileLoading,
  chartOwnerUserId,
  chartRefreshKey,
  chartsReady,
  profileId,
  showNatalAspectPatterns,
  socialFriendCharts
}: UseManualChartsControllerOptions): ManualChartsController {
  const initialCachedCharts = useMemo(
    () => manualChartsWithReliableAngleLongitudes(
      listCachedManualCharts([chartOwnerUserId, profileId])
    ),
    [chartOwnerUserId, profileId]
  );
  const [charts, setCharts] = useState<ManualChart[]>(() => (
    allowCachedChartsWhileLoading ? initialCachedCharts : []
  ));
  const [form, setForm] = useState<ManualChartForm>(defaultManualChartForm);
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null);
  const [status, setStatus] = useState<ManualChartsStatus>(
    () => allowCachedChartsWhileLoading && initialCachedCharts.length > 0 ? "idle" : "loading"
  );
  const [message, setMessage] = useState("");
  const chartsLoadedRef = useRef(false);
  const chartOwnerUserIdRef = useRef(chartOwnerUserId);
  const socialFriendChartsRef = useRef(socialFriendCharts);
  socialFriendChartsRef.current = socialFriendCharts;
  const formCopy = manualChartFormCopy[form.chartType];

  useEffect(() => {
    let cancelled = false;
    const chartOwnerChanged = chartOwnerUserIdRef.current !== chartOwnerUserId;

    if (chartOwnerChanged) {
      chartOwnerUserIdRef.current = chartOwnerUserId;
      chartsLoadedRef.current = false;
      setSelectedChartId(null);
    }

    if (!chartsReady) {
      const cachedCharts = listCachedManualCharts([chartOwnerUserId, profileId]);
      const reliableCachedCharts = manualChartsWithReliableAngleLongitudes(cachedCharts);

      if (allowCachedChartsWhileLoading && reliableCachedCharts.length > 0) {
        chartsLoadedRef.current = true;
        setCharts(reliableCachedCharts);
        setStatus("idle");
      } else {
        setCharts([]);
        setStatus("loading");
      }

      return () => {
        cancelled = true;
      };
    }

    if (allowCachedChartsWhileLoading && !chartsLoadedRef.current) {
      const cachedCharts = listCachedManualCharts([chartOwnerUserId, profileId]);
      const reliableCachedCharts = manualChartsWithReliableAngleLongitudes(cachedCharts);

      if (reliableCachedCharts.length > 0) {
        chartsLoadedRef.current = true;
        setCharts(reliableCachedCharts);
        setStatus("idle");
      }
    }

    if (!chartsLoadedRef.current) {
      setStatus("loading");
    }

    listManualCharts(chartOwnerUserId)
      .then((nextCharts) => {
        if (!cancelled) {
          const reliableNextCharts = manualChartsWithReliableAngleLongitudes(nextCharts);
          chartsLoadedRef.current = true;
          setCharts(reliableNextCharts);
          setSelectedChartId((currentId) => (
            currentId && (
              reliableNextCharts.some((chart) => chart.id === currentId)
              || socialFriendChartsRef.current.some((chart) => chart.id === currentId)
            )
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
  }, [allowCachedChartsWhileLoading, chartOwnerUserId, chartRefreshKey, chartsReady, profileId]);

  useEffect(() => {
    if (!chartsReady || charts.length === 0) {
      return;
    }

    const chartsToRepair = friendChartRepairBatch(
      charts.filter(manualChartNeedsNatalRepair),
      selectedChartId
    );

    if (chartsToRepair.length === 0) {
      return;
    }

    let cancelled = false;
    const repairCharts = () => enhanceFriendChartsAtomically(
      chartsToRepair,
      async (chart) => {
        if (cancelled) {
          return null;
        }

        const birthLocation = await resolvedManualChartBirthLocationForRepair(chart);
        if (!birthLocation) {
          return null;
        }

        const birthTimeForChart = twentyFourHourTimeToDisplay(chart.birthTime ?? "12:00");
        const birthDateTime = zonedDateTimeToUtc(chart.birthDate, birthTimeForChart, birthLocation.timeZone);
        const calculatedNatalChart = await calculateSky(birthLocation, birthDateTime);
        const storedNatalChart = await natalSkyWithAspectPatternsForStorage(
          calculatedNatalChart,
          birthLocation,
          birthDateTime,
          !chart.birthTimeUnknown,
          showNatalAspectPatterns
        );
        const natalChart = natalChartWithReliableAngleLongitudes(
          storedNatalChart,
          chart.birthTimeUnknown
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

        return manualChartWithReliableAngleLongitudes(
          await updateManualChart(chartOwnerUserId, chart.id, input)
        );
      },
      (repairedCharts) => {
        setCharts((currentCharts) => {
          const repairedById = new Map(repairedCharts.map((chart) => [chart.id, chart]));

          return currentCharts
            .map((chart) => repairedById.get(chart.id) ?? chart)
            .sort((first, second) => first.displayName.localeCompare(second.displayName));
        });
      },
      () => cancelled
    );
    const cancelScheduledRepair = scheduleFriendChartRepair(() => {
      void repairCharts();
    });

    return () => {
      cancelled = true;
      cancelScheduledRepair();
    };
  }, [chartOwnerUserId, charts, chartsReady, selectedChartId, showNatalAspectPatterns]);

  function resetForm(nextMessage = "") {
    setForm(defaultManualChartForm);
    setEditingChartId(null);
    setMessage(nextMessage);
  }

  function editChart(chart: ManualChart) {
    setEditingChartId(chart.id);
    setForm(manualChartFormFromChart(chart));
    setMessage("");
  }

  function addBirthTime(chart: ManualChart) {
    setEditingChartId(chart.id);
    setForm({
      ...manualChartFormFromChart(chart),
      birthTime: "",
      birthTimeUnknown: false
    });
    setMessage("");
  }

  function updateField<Key extends keyof ManualChartForm>(key: Key, value: ManualChartForm[Key]) {
    setForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  function updateChartType(chartType: ManualChartType) {
    setForm((currentForm) => ({
      ...currentForm,
      chartType,
      pronouns: chartType === "event" ? defaultPronounChoice : currentForm.pronouns,
      relationshipType: chartType === "event" ? "friend" : normalizeRelationshipContextKey(currentForm.relationshipType)
    }));
  }

  async function saveChart(event: FormEvent<HTMLFormElement>): Promise<SavedManualChart | null> {
    event.preventDefault();

    const displayName = form.displayName.trim();
    const birthDate = form.birthDate;
    const birthPlace = form.birthPlace.trim();
    const selectedBirthLocation = birthPlace && form.birthLocation?.label === birthPlace
      ? form.birthLocation
      : null;
    const birthLocation = selectedBirthLocation ? withTimeZone(selectedBirthLocation) : null;

    if (!displayName || !birthDate || !birthPlace || !birthLocation) {
      setMessage(!birthLocation && birthPlace
        ? "Choose a city from the birth place suggestions. If it is already selected, timezone lookup is unavailable."
        : formCopy.requiredMessage);
      return null;
    }

    if (!form.birthTimeUnknown && !form.birthTime) {
      setMessage(formCopy.timeMessage);
      return null;
    }

    setStatus("saving");
    setMessage("");

    try {
      const birthTimeForChart = form.birthTimeUnknown
        ? "12:00 PM"
        : twentyFourHourTimeToDisplay(form.birthTime);
      const birthDateTime = zonedDateTimeToUtc(birthDate, birthTimeForChart, birthLocation.timeZone);
      const calculatedNatalChart = await calculateSky(birthLocation, birthDateTime);
      const storedNatalChart = await natalSkyWithAspectPatternsForStorage(
        calculatedNatalChart,
        birthLocation,
        birthDateTime,
        !form.birthTimeUnknown,
        showNatalAspectPatterns
      );
      const natalChart = natalChartWithReliableAngleLongitudes(
        storedNatalChart,
        form.birthTimeUnknown
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
      const wasEditing = Boolean(editingChartId);
      const persistedChart = editingChartId
        ? await updateManualChart(chartOwnerUserId, editingChartId, input)
        : await createManualChart(chartOwnerUserId, input);
      const savedChart = manualChartWithReliableAngleLongitudes(persistedChart);

      setCharts((currentCharts) => {
        const nextCharts = editingChartId
          ? currentCharts.map((chart) => chart.id === savedChart.id ? savedChart : chart)
          : [...currentCharts, savedChart];

        return nextCharts.sort((first, second) => first.displayName.localeCompare(second.displayName));
      });
      setSelectedChartId(savedChart.id);
      return { chart: savedChart, wasEditing };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : typeof error === "object" && error && "message" in error && typeof error.message === "string"
          ? error.message
          : "Could not save chart.";

      setMessage(errorMessage);
      return null;
    } finally {
      setStatus("idle");
    }
  }

  async function removeChart(chart: ManualChart) {
    setStatus("deleting");
    setMessage("");

    try {
      await deleteManualChart(chartOwnerUserId, chart.id);
      setCharts((currentCharts) => currentCharts.filter((candidate) => candidate.id !== chart.id));
      setSelectedChartId((currentId) => currentId === chart.id ? null : currentId);
      if (editingChartId === chart.id) {
        resetForm();
      }
      setMessage("Chart deleted.");
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete chart.");
      return false;
    } finally {
      setStatus("idle");
    }
  }

  return {
    charts,
    editingChartId,
    form,
    formCopy,
    message,
    selectedChartId,
    setForm,
    setSelectedChartId,
    status,
    addBirthTime,
    editChart,
    removeChart,
    resetForm,
    saveChart,
    updateChartType,
    updateField
  };
}
