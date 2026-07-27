import type { LocationInput, SkySnapshot } from "../types";
import { normalizeSkyBodyName, transitToNatalOrbLimit } from "../astrologyConfig";
import type {
  AspectPatternActivationInterpretationContext,
  AspectPatternDetectionResult,
  ResolvedAspectPatternActivationCopy,
  ResolvedAspectPatternCopy
} from "@tldr/astro-knowledge/aspect-pattern-engine";

type NatalAspectPatternReaderStatus = "loading" | "ready" | "unavailable";

type PatternActivationTimingSource = {
  patternId: string;
  trigger?: {
    exactAt?: unknown;
    movingBody?: unknown;
  };
};

export type NatalAspectPatternActivationTimingWindow = {
  startLabel: string;
  exactLabel: string;
  endLabel: string;
  rangeLabel: string;
  durationLabel?: string;
  activeRangeLabel?: string;
};

export type NatalAspectPatternReaderItem = {
  patternId: string;
  patternType: string;
  copy: ResolvedAspectPatternCopy;
  activationCopy?: ResolvedAspectPatternActivationCopy;
  activationEmphasis: "primary" | "secondary" | "none";
  activationExpanded: boolean;
  activationTimingWindow?: NatalAspectPatternActivationTimingWindow;
  rank: number;
  isContained: boolean;
  parentPatternIds: string[];
  childPatternIds: string[];
};

export type NatalAspectPatternPillSummary = {
  label: string;
  patternNames: string[];
};

const natalAspectPatternNames: Record<string, string> = {
  t_square: "T-square",
  grand_square: "Grand Cross",
  grand_trine: "Grand Trine",
  kite: "Kite",
  yod: "Yod",
  mystic_rectangle: "Mystic Rectangle"
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
  options: { includeActivationCopy?: boolean; timeKnown?: boolean } = {}
): Promise<AspectPatternDetectionResult> {
  const params = new URLSearchParams({
    lat: String(location.latitude),
    lon: String(location.longitude),
    label: location.label,
    date: date.toISOString(),
    includeAspectPatterns: "true",
    includeAspectPatternCopy: "true"
  });

  if (options.timeKnown === false) {
    params.set("timeKnown", "false");
  }

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

  if (!response.ok || json.ok === false || !json.sky?.aspectPatterns?.interpretationContexts) {
    throw new Error(json.error || "Natal aspect-pattern detection could not load.");
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

export function natalAspectPatternPillSummary(
  snapshot: SkySnapshot | null | undefined
): NatalAspectPatternPillSummary | null {
  const detection = snapshot?.aspectPatterns;
  const confidentPatterns = (detection?.patterns ?? []).filter((pattern) => (
    pattern.geometry.confidence === "exact" || pattern.geometry.confidence === "strong"
  ));

  if (confidentPatterns.length === 0) {
    return null;
  }

  const confidentIds = new Set(confidentPatterns.map((pattern) => pattern.id));
  const containedIds = new Set(
    (detection?.relationships ?? [])
      .filter((relationship) => (
        relationship.relationship === "contains"
        && confidentIds.has(relationship.parentPatternId)
        && confidentIds.has(relationship.childPatternId)
      ))
      .map((relationship) => relationship.childPatternId)
  );
  const displayOrder = detection?.ranking?.displayOrder ?? detection?.patterns.map((pattern) => pattern.id) ?? [];
  const displayIndex = new Map(displayOrder.map((patternId, index) => [patternId, index]));
  const visiblePatterns = confidentPatterns
    .filter((pattern) => !containedIds.has(pattern.id))
    .sort((first, second) => (
      (displayIndex.get(first.id) ?? Number.MAX_SAFE_INTEGER)
      - (displayIndex.get(second.id) ?? Number.MAX_SAFE_INTEGER)
      || first.geometry.maximumOrb - second.geometry.maximumOrb
      || first.id.localeCompare(second.id)
    ));

  if (visiblePatterns.length === 0) {
    return null;
  }

  const patternNames = visiblePatterns.map((pattern) => natalAspectPatternNames[pattern.type] ?? "Chart pattern");
  const primaryName = patternNames[0];

  return {
    label: visiblePatterns.length > 1 ? `${primaryName} +${visiblePatterns.length - 1}` : primaryName,
    patternNames
  };
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

function dateFromOffsetDays(dateValue: string, days: number) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(date.getTime() + days * 86_400_000);
}

function formatActivationDate(dateValue: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(dateValue);
}

function primaryActivationTrigger(context: AspectPatternActivationInterpretationContext | undefined) {
  if (!context) return null;

  return context.triggers.find((trigger) => trigger.activationId === context.primaryTrigger.activationId) ?? context.triggers[0] ?? null;
}

function activationTimingWindowForTrigger(trigger: { exactAt?: unknown; movingBody?: unknown } | null | undefined): NatalAspectPatternActivationTimingWindow | undefined {
  const exactAt = typeof trigger?.exactAt === "string" ? trigger.exactAt : "";
  const movingBody = typeof trigger?.movingBody === "string" ? trigger.movingBody : "";

  if (!exactAt || !movingBody) {
    return undefined;
  }

  const normalizedMovingBody = normalizeSkyBodyName(movingBody);
  const speed = averageDailyMotion[normalizedMovingBody] ?? 1;
  const applyingOrb = transitToNatalOrbLimit(normalizedMovingBody, "applying") || transitToNatalOrbLimit(normalizedMovingBody);
  const separatingOrb = transitToNatalOrbLimit(normalizedMovingBody, "separating") || transitToNatalOrbLimit(normalizedMovingBody);
  const start = dateFromOffsetDays(exactAt, -(applyingOrb / speed));
  const end = dateFromOffsetDays(exactAt, separatingOrb / speed);
  const exact = new Date(exactAt);

  if (!start || !end || Number.isNaN(exact.getTime())) {
    return undefined;
  }

  const startLabel = formatActivationDate(start);
  const exactLabel = formatActivationDate(exact);
  const endLabel = formatActivationDate(end);

  return {
    startLabel,
    exactLabel,
    endLabel,
    rangeLabel: `${startLabel} - ${endLabel}`
  };
}

function activationTimingWindowFromContext(context: AspectPatternActivationInterpretationContext | undefined): NatalAspectPatternActivationTimingWindow | undefined {
  return activationTimingWindowForTrigger(primaryActivationTrigger(context));
}

export function natalAspectPatternReaderItems(
  snapshot: SkySnapshot | null,
  _voice: "you" | "they" = "you"
): NatalAspectPatternReaderItem[] {
  const contexts = snapshot?.aspectPatterns?.interpretationContexts ?? [];
  const resolvedCopies = snapshot?.aspectPatterns?.resolvedCopy ?? [];
  const activation = snapshot?.aspectPatterns?.activation as
    | (NonNullable<AspectPatternDetectionResult["activation"]> & { resolvedCopy?: ResolvedAspectPatternActivationCopy[] })
    | undefined;
  const activations = activation?.activations ?? [];
  const activationContexts = activation?.interpretationContexts ?? [];
  const activationResolvedCopies = activation?.resolvedCopy ?? [];
  const activationDisplayOrder = activation?.currentDisplayOrder ?? [];
  const copyById = new Map(resolvedCopies.map((copy) => [copy.patternId, copy]));
  const activationById = new Map((activations as PatternActivationTimingSource[]).map((entry) => [entry.patternId, entry]));
  const activationContextById = new Map(activationContexts.map((context) => [context.patternId, context]));
  const activationCopyById = new Map(activationResolvedCopies.map((copy) => [copy.patternId, copy]));
  const primaryActivePatternId = activationDisplayOrder[0] ?? null;

  return contexts.flatMap((context) => {
    const copy = copyById.get(context.patternId);

    if (!copy) {
      return [];
    }

    const activationContext = activationContextById.get(context.patternId);
    const activationCopy = activationContext ? activationCopyById.get(context.patternId) : undefined;
    const activationEmphasis: NatalAspectPatternReaderItem["activationEmphasis"] = activationCopy
      ? context.patternId === primaryActivePatternId ? "primary" : "secondary"
      : "none";
    const activationTiming = activationTimingWindowFromContext(activationContext)
      ?? activationTimingWindowForTrigger(activationById.get(context.patternId)?.trigger);

    return [{
      patternId: context.patternId,
      patternType: context.patternType,
      copy,
      activationCopy,
      activationEmphasis,
      activationExpanded: Boolean(activationCopy && context.patternId === primaryActivePatternId),
      activationTimingWindow: activationTiming,
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
  if (!natalSky?.aspectPatterns?.interpretationContexts) return "unavailable";
  return "ready";
}
