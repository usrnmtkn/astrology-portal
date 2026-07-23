import type { LocationInput, SkySnapshot } from "../types";
import { normalizeSkyBodyName, transitToNatalOrbLimit } from "../astrologyConfig";
import type {
  AspectPatternActivationInterpretationContext,
  AspectPatternDetectionResult,
  ResolvedAspectPatternActivationCopy,
  ResolvedAspectPatternCopy
} from "@tldr/astro-knowledge/aspect-pattern-engine";
import { renderAspectPatternV3, SourceGapError } from "../content/fallbackArchitectureV3Runtime";

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
    includeAspectPatternCopy: "false"
  });

  if (options.includeActivationCopy) {
    params.set("includeAspectPatternActivation", "true");
    params.set("includeAspectPatternActivationContexts", "true");
    params.set("includeAspectPatternActivationCopy", "false");
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
  voice: "you" | "they" = "you"
): NatalAspectPatternReaderItem[] {
  const contexts = snapshot?.aspectPatterns?.interpretationContexts ?? [];
  const activations = snapshot?.aspectPatterns?.activation?.activations ?? [];
  const activationContexts = snapshot?.aspectPatterns?.activation?.interpretationContexts ?? [];
  const activationDisplayOrder = snapshot?.aspectPatterns?.activation?.currentDisplayOrder ?? [];
  const contextById = new Map(contexts.map((context) => [context.patternId, context]));
  const activationById = new Map((activations as PatternActivationTimingSource[]).map((activation) => [activation.patternId, activation]));
  const activationContextById = new Map(activationContexts.map((context) => [context.patternId, context]));
  const primaryActivePatternId = activationDisplayOrder[0] ?? null;

  return contexts.flatMap((rawContext) => {
    const context = rawContext as any;
    try {
    const apex = "apex" in context.roles ? context.roles.apex : "focalPlanet" in context.roles ? context.roles.focalPlanet : undefined;
    const element = context.patternType === "grand_trine"
      ? context.roles.elementConsistency === "same_element" ? String(context.members[0]?.sign ?? "").toLowerCase() : undefined
      : undefined;
    const rendered = renderAspectPatternV3({
      type: context.patternType,
      apexTitle: apex,
      element,
      voice
    });
    const copy = {
      patternId: context.patternId,
      patternType: context.patternType,
      source: { recordId: rendered.templateKey, contentLevel: "source_grounded_template", status: "approved", resolverVersion: "v3" },
      content: { headline: rendered.headline, overview: rendered.parts[0] ?? rendered.body, sections: rendered.parts.slice(1).map((body: string, index: number) => ({ id: `package_${index + 1}`, body })) },
      diagnostics: { templateId: rendered.templateKey, usedFallback: false, missingSlots: [], skippedSections: [] }
    } as ResolvedAspectPatternCopy;
    const activationContext = activationContextById.get(context.patternId);
    let activationCopy: ResolvedAspectPatternActivationCopy | undefined;
    if (activationContext) {
      const active = renderAspectPatternV3({
        type: context.patternType,
        apexTitle: apex,
        element,
        activation: true,
        voice
      });
      activationCopy = {
        patternId: context.patternId,
        patternType: context.patternType,
        triggerSummary: {
          movingBodies: activationContext.triggers.map((trigger) => trigger.movingBody),
          targetedNatalPlanets: activationContext.triggers.map((trigger) => trigger.targetNatalPlanet)
        },
        content: { headline: active.headline, overview: active.body, sections: [] }
      } as unknown as ResolvedAspectPatternActivationCopy;
    }
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
    } catch (error) {
      if (error instanceof SourceGapError) return [];
      throw error;
    }
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
