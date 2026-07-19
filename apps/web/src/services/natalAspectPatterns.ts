import type { LocationInput, SkySnapshot } from "../types";
import type { AspectPatternDetectionResult, ResolvedAspectPatternActivationCopy, ResolvedAspectPatternCopy } from "@tldr/astro-knowledge/aspect-pattern-engine";

type NatalAspectPatternReaderStatus = "loading" | "ready" | "unavailable";

export type NatalAspectPatternReaderItem = {
  patternId: string;
  patternType: string;
  copy: ResolvedAspectPatternCopy;
  activationCopy?: ResolvedAspectPatternActivationCopy;
  activationEmphasis: "primary" | "secondary" | "none";
  activationExpanded: boolean;
  rank: number;
  isContained: boolean;
  parentPatternIds: string[];
  childPatternIds: string[];
};

export const natalAspectPatternReaderFlagStorageKey = "tldrastro:natalAspectPatterns";
export const natalAspectPatternActivationFlagStorageKey = "tldrastro:natalAspectPatternActivation";

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

export function natalAspectPatternActivationEnabled() {
  if (!natalAspectPatternReaderEnabled()) return false;
  if (envFlagEnabled(import.meta.env.VITE_ENABLE_NATAL_ASPECT_PATTERN_ACTIVATION)) return true;
  if (import.meta.env.PROD) return false;

  try {
    return envFlagEnabled(window.localStorage.getItem(natalAspectPatternActivationFlagStorageKey));
  } catch {
    return false;
  }
}

export async function fetchNatalAspectPatternsWithCopy(
  location: LocationInput,
  date: Date,
  options: { includeActivationCopy?: boolean } = {}
): Promise<AspectPatternDetectionResult> {
  const params = new URLSearchParams({
    lat: String(location.latitude),
    lon: String(location.longitude),
    label: location.label,
    date: date.toISOString(),
    includeAspectPatterns: "true",
    includeAspectPatternCopy: "true"
  });

  if (options.includeActivationCopy) {
    params.set("includeAspectPatternActivation", "true");
    params.set("includeAspectPatternActivationContexts", "true");
    params.set("includeAspectPatternActivationCopy", "true");
  }

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
  const activationCopies = snapshot?.aspectPatterns?.activation?.resolvedCopy ?? [];
  const activationDisplayOrder = snapshot?.aspectPatterns?.activation?.currentDisplayOrder ?? [];
  const contextById = new Map(contexts.map((context) => [context.patternId, context]));
  const activationCopyById = new Map(activationCopies.map((copy) => [copy.patternId, copy]));
  const primaryActivePatternId = activationDisplayOrder.find((patternId) => activationCopyById.has(patternId)) ?? activationCopies[0]?.patternId ?? null;

  return copies.flatMap((copy) => {
    const context = contextById.get(copy.patternId);
    if (!context) return [];
    const activationCopy = activationCopyById.get(copy.patternId);
    const activationEmphasis: NatalAspectPatternReaderItem["activationEmphasis"] = activationCopy
      ? copy.patternId === primaryActivePatternId ? "primary" : "secondary"
      : "none";

    return [{
      patternId: copy.patternId,
      patternType: copy.patternType,
      copy,
      activationCopy,
      activationEmphasis,
      activationExpanded: Boolean(activationCopy && copy.patternId === primaryActivePatternId),
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
