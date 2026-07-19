import type { LocationInput, SkySnapshot } from "../types";
import type { AspectPatternDetectionResult, ResolvedAspectPatternCopy } from "@tldr/astro-knowledge/aspect-pattern-engine";

type NatalAspectPatternReaderStatus = "loading" | "ready" | "unavailable";

export type NatalAspectPatternReaderItem = {
  patternId: string;
  patternType: string;
  copy: ResolvedAspectPatternCopy;
  rank: number;
  isContained: boolean;
  parentPatternIds: string[];
  childPatternIds: string[];
};

export const natalAspectPatternReaderFlagStorageKey = "tldrastro:natalAspectPatterns";

function envFlagEnabled(value: unknown) {
  const normalized = String(value ?? "false").trim().toLowerCase();
  return ["1", "true", "yes", "enabled", "on"].includes(normalized);
}

export function natalAspectPatternReaderEnabled() {
  if (envFlagEnabled(import.meta.env.VITE_ENABLE_NATAL_ASPECT_PATTERNS)) return true;
  if (import.meta.env.PROD) return false;

  try {
    return envFlagEnabled(window.localStorage.getItem(natalAspectPatternReaderFlagStorageKey));
  } catch {
    return false;
  }
}

export async function fetchNatalAspectPatternsWithCopy(
  location: LocationInput,
  date: Date
): Promise<AspectPatternDetectionResult> {
  const params = new URLSearchParams({
    lat: String(location.latitude),
    lon: String(location.longitude),
    label: location.label,
    date: date.toISOString(),
    includeAspectPatterns: "true",
    includeAspectPatternCopy: "true"
  });

  if (location.timeZone) {
    params.set("timeZone", location.timeZone);
  }

  const response = await fetch(`/api/astrology-facts?${params.toString()}`, { method: "GET" });
  const json = await response.json() as {
    ok?: boolean;
    error?: string;
    sky?: SkySnapshot;
    aspectPatterns?: AspectPatternDetectionResult;
  };

  if (!response.ok || json.ok === false || !json.sky?.aspectPatterns?.resolvedCopy) {
    throw new Error(json.error || "Natal aspect-pattern copy could not load.");
  }

  return json.sky.aspectPatterns;
}

export function skyWithNatalAspectPatternCopy(
  snapshot: SkySnapshot,
  aspectPatterns: AspectPatternDetectionResult
): SkySnapshot {
  return {
    ...snapshot,
    aspectPatterns
  };
}

export function natalAspectPatternReaderItems(snapshot: SkySnapshot | null): NatalAspectPatternReaderItem[] {
  const contexts = snapshot?.aspectPatterns?.interpretationContexts ?? [];
  const copies = snapshot?.aspectPatterns?.resolvedCopy ?? [];
  const contextById = new Map(contexts.map((context) => [context.patternId, context]));

  return copies.flatMap((copy) => {
    const context = contextById.get(copy.patternId);
    if (!context) return [];

    return [{
      patternId: copy.patternId,
      patternType: copy.patternType,
      copy,
      rank: context.display.rank,
      isContained: context.display.isContained,
      parentPatternIds: context.display.parentPatternIds.slice(),
      childPatternIds: context.display.childPatternIds.slice()
    }];
  }).sort((first, second) => first.rank - second.rank || first.patternId.localeCompare(second.patternId));
}

export function natalAspectPatternReaderStatus(
  enabled: boolean,
  natalSky: SkySnapshot | null,
  natalChartPending: boolean,
  loadStatus: "idle" | NatalAspectPatternReaderStatus
): NatalAspectPatternReaderStatus {
  if (!enabled) return "unavailable";
  if (natalChartPending || loadStatus === "loading") return "loading";
  if (loadStatus === "unavailable") return "unavailable";
  if (!natalSky?.aspectPatterns?.resolvedCopy) return "unavailable";
  return "ready";
}
